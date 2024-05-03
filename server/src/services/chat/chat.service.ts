import { debounce } from 'lodash';
import { ChatMessage } from '../../../../types';
import { createNewMessage } from '../../lib/createNewMessage';
import { BusEventEnum, EventBus } from '../../lib/eventBus';
import { generate } from '../../lib/generate';
import { replaceTemplates } from '../../lib/replaceTemplates';
import { generateChatFilename } from '../../util/generateChatFilename';
import { AffinityService } from '../affinity/affinity.service';
import { Config } from '../config/config.service';
import { FileService } from '../fs/fs.service';
import { SocketClientService } from '../socket-client/socket.client.service';

export class ChatService {
	static LAST_CHAT_ID_PATH = 'lastActiveChat.txt';
	static CHATS_DIR = 'chats';

	static addMessageAndContinue = debounce(
		(message: ChatMessage) => {
			this.addMessage(message);
			generate([...this.currentChat]);
		},
		500,
		{ leading: false, trailing: true }
	);

	static addMessageAndReply = async (message: ChatMessage) => {
		this.addMessage(message);
		this.addMessageAndContinue(createNewMessage('char'));
	};

	static addMessage = (message: ChatMessage) => {
		const chat = this.currentChat;
		chat.push(message);
		ChatService.saveChat(chat);
		SocketClientService.onMessageReceived(message);
		// don't trigger listeners if it's a message to continue from.
		message.messages[message.activeIdx].length &&
			EventBus.send({
				key: BusEventEnum.MESSAGE_UPDATED,
				data: message,
			});
	};

	static retry = () => {
		const chat = this.currentChat;
		const messageToRetry = chat[chat.length - 1];
		messageToRetry.messages = [...(messageToRetry.messages || []), ''];
		messageToRetry.activeIdx = messageToRetry.messages.length - 1;
		this.editMessage(messageToRetry);
		generate(chat);
	};

	static updateMessageWithChunk = (messageId: number, chunk: string) => {
		const messageToUpdate = ChatService.currentChat.find(
			(m) => m.date === messageId
		);
		if (messageToUpdate.persona === 'char' && AffinityService.lastAffinity) {
			messageToUpdate.affinity = AffinityService.lastAffinity.amount;
		}
		const messageIdx = messageToUpdate.activeIdx;

		if (
			messageToUpdate.messages[messageIdx] === '' ||
			messageToUpdate.messages[messageIdx].slice(-1)[0] === ' '
		) {
			// llama3 often inserts another space at the start when continuing
			chunk = chunk.trimStart();
		}
		messageToUpdate.messages[messageIdx] += chunk;
		const chat = this.currentChat;
		SocketClientService.onMessageChunkReceived(messageToUpdate);
		chat.splice(
			chat.findIndex((m) => m.date === messageId),
			1,
			messageToUpdate
		);
		ChatService.saveChat(chat);
	};

	static editMessage = (message: ChatMessage) => {
		const chat = this.currentChat;
		SocketClientService.onMessageReceived(message);
		chat.splice(
			chat.findIndex((m) => m.date === message.date),
			1,
			message
		);
		ChatService.saveChat(chat);
		EventBus.send({
			key: BusEventEnum.MESSAGE_UPDATED,
			data: message,
		});
	};

	static cut = ({ start, end }: { start: string; end: string }) => {
		const chat = this.currentChat;
		const slicedChat = chat
			.slice(0, parseInt(start))
			.concat(chat.slice(parseInt(end ?? start) + 1, chat.length));
		SocketClientService.onChatUpdate(slicedChat);
		ChatService.saveChat(slicedChat);
	};

	static pruneUnpinned = () => {
		const chat = this.currentChat.filter((m) => m.state === 'pinned');
		SocketClientService.onChatUpdate(chat);
		ChatService.saveChat(chat);
	};

	static deleteMessage = (message: ChatMessage) => {
		const chat = this.currentChat;
		SocketClientService.onMessageDeleted(message);
		chat.splice(
			chat.findIndex((m) => m.date === message.date),
			1
		);
		ChatService.saveChat(chat);
	};

	static saveChat = (chat: ChatMessage[]) => {
		EventBus.send({
			key: BusEventEnum.CHAT_UPDATED,
			data: chat,
		});
		try {
			if (!this.currentChatId) {
				// it's a new chat
				this.updateCurrentChatId(new Date().getTime());
			}
			FileService.writeToDataFile(
				`${this.CHATS_DIR}/chat.${this.currentChatId}.txt`,
				JSON.stringify(chat)
			);
			this.refreshChatsList();
		} catch (error) {
			console.warn('Save chat error:', error);
		}
	};

	static deleteChat = (chatId: number) => {
		FileService.deleteDataFile(
			`${this.CHATS_DIR}/${generateChatFilename(chatId)}`
		);
		if (chatId === this.currentChatId) {
			const chats = this.getListOfChats();
			const firstChat = chats[0]?.id;
			if (firstChat) {
				this.loadChat(firstChat);
			} else {
				const newChat = this.createNewChat();
				SocketClientService.onChatUpdate(newChat);
			}
		}
		this.refreshChatsList();
	};

	static branchChat = (message: ChatMessage) => {
		const branchedChat = this.currentChat.slice(
			0,
			this.currentChat.findIndex((m) => m.date === message.date) + 1
		);
		this.updateCurrentChatId(new Date().getTime());
		this.saveChat(branchedChat);
		this.refreshChatsList();
		SocketClientService.onChatUpdate(branchedChat);
	};

	static getChatById = (chatId: number): ChatMessage[] => {
		const content = FileService.findInDataDir(
			this.CHATS_DIR,
			generateChatFilename(chatId)
		);
		const chat = content && JSON.parse(content);
		if (!chat?.length) {
			return [this.introMessage];
		} else {
			return chat;
		}
	};

	static updateCurrentChatId = (chatId: number) => {
		FileService.writeToDataFile(this.LAST_CHAT_ID_PATH, chatId.toString());
	};

	static loadChat = (chatId: number) => {
		const chat = this.getChatById(chatId);
		this.updateCurrentChatId(chatId);
		SocketClientService.onChatUpdate(chat);
	};

	static refreshChatsList = () => {
		const chats = this.getListOfChats();
		SocketClientService.onChatsListReceived(chats);
	};

	static getListOfChats = () => {
		const files = FileService.getDataDirContents(this.CHATS_DIR);
		return files
			.map((name) => parseInt(name.split('.')[1]))
			.filter((id) => !isNaN(id))
			.map((id) => {
				return {
					lastMessage: this.getChatById(id).slice(-1)[0],
					id,
				};
			});
	};

	static createNewChat = () => {
		const newChat = [this.introMessage];
		this.updateCurrentChatId(new Date().getTime());
		this.refreshChatsList();
		return newChat;
	};

	static get currentChat(): ChatMessage[] {
		try {
			if (this.currentChatId) {
				return this.getChatById(this.currentChatId);
			} else {
				return this.createNewChat();
			}
		} catch (error) {
			return this.createNewChat();
		}
	}

	static get currentChatId() {
		const id = FileService.getDataFile(this.LAST_CHAT_ID_PATH);
		return id ? parseInt(id) : null;
	}

	static get introMessage() {
		return createNewMessage('narrator', replaceTemplates(Config.Intro));
	}
}
