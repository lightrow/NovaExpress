import { debounce } from 'lodash';
import { ChatMessage } from '../../../../types';
import { createNewMessage } from '../../lib/createNewMessage';
import { BusEventEnum, EventBus } from '../../lib/eventBus';
import { generate } from '../../lib/generate';
import { replaceTemplates } from '../../lib/replaceTemplates';
import { AffinityService } from '../affinity/affinity.service';
import { ChatManagerService } from '../chat-manager/chat-manager.service';
import { FileService } from '../fs/fs.service';
import { PatienceService } from '../patience/patience.service';
import { SocketClientService } from '../socket-client/socket.client.service';
import { getThinkMessageStart } from '../../lib/getRandomThinkStart';

export class ChatService {
	static addMessageAndContinue = debounce(
		(message: ChatMessage) => {
			this.addMessage(message);
			generate([...this.chat]);
		},
		500,
		{ leading: false, trailing: true }
	);

	static addMessageAndReply = async (message: ChatMessage) => {
		this.addMessage(message);
		// if (Context.status === 'away') {
		// 	return;
		// }
		this.addMessageAndContinue(createNewMessage('char'));
	};

	static addMessage = (message: ChatMessage) => {
		message.messages = message.messages.map((m) => replaceTemplates(m));
		const chat = this.chat;
		if (message.persona === 'char' && !message.messages[message.activeIdx]) {
			message.messages[message.activeIdx] = getThinkMessageStart();
		}
		if (message.persona === 'char' && AffinityService.lastAffinity) {
			message.affinity = AffinityService.lastAffinity.amount;
		}
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
		const chat = this.chat;
		const messageToRetry = chat[chat.length - 1];
		messageToRetry.messages = [
			...(messageToRetry.messages || []),
			messageToRetry.persona === 'char' ? getThinkMessageStart() : '',
		];
		messageToRetry.activeIdx = messageToRetry.messages.length - 1;
		this.editMessage(messageToRetry);
		generate(chat);
	};

	static updateMessageWithChunk = (
		messageId: number,
		chunk: string,
		final?: boolean
	) => {
		const messageToUpdate = ChatService.chat.find((m) => m.date === messageId);

		const messageIdx = messageToUpdate.activeIdx;

		if (
			messageToUpdate.messages[messageIdx] === '' ||
			messageToUpdate.messages[messageIdx].slice(-1)[0] === ' '
		) {
			// llama3 often inserts another space at the start when continuing
			chunk = chunk.trimStart();
		}
		messageToUpdate.messages[messageIdx] += chunk;

		const replyTriggers = [
			'?',
			'tell me',
			'advise',
			'let me know',
			'could you',
		];

		if (
			final &&
			replyTriggers.find((trigger) =>
				messageToUpdate.messages[messageIdx].includes(trigger)
			)
		) {
			PatienceService.beginAutoTriggerCountdown(true);
		}

		const chat = this.chat;
		SocketClientService.onMessageChunkReceived(messageToUpdate);
		chat.splice(
			chat.findIndex((m) => m.date === messageId),
			1,
			messageToUpdate
		);
		ChatService.saveChat(chat);
	};

	static editMessage = (message: ChatMessage) => {
		message.messages = message.messages.map((m) => replaceTemplates(m));
		const chat = this.chat;
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
		const chat = this.chat;
		const slicedChat = chat
			.slice(0, parseInt(start))
			.concat(chat.slice(parseInt(end ?? start) + 1, chat.length));
		SocketClientService.onChatUpdate(slicedChat);
		ChatService.saveChat(slicedChat);
	};

	static pruneUnpinned = () => {
		const chat = this.chat.filter((m) => m.state === 'pinned');
		if (!chat.length) {
			chat.push(ChatManagerService.intro);
		}
		SocketClientService.onChatUpdate(chat);
		ChatService.saveChat(chat);
	};

	static deleteMessage = (message: ChatMessage) => {
		const chat = this.chat;
		if (this.chat.length === 1) {
			return;
		}
		SocketClientService.onMessageDeleted(message);
		chat.splice(
			chat.findIndex((m) => m.date === message.date),
			1
		);
		// somehow
		if (!chat.length) {
			chat.push(ChatManagerService.intro);
		}
		ChatService.saveChat(chat);
	};

	static saveChat = (chat: ChatMessage[]) => {
		EventBus.send({
			key: BusEventEnum.CHAT_UPDATED,
			data: chat,
		});
		FileService.writeToDataFile(
			ChatManagerService.curDir + 'chat.txt',
			JSON.stringify(chat)
		);
	};

	static branchChat = (message: ChatMessage) => {
		const branchedChat = this.chat.slice(
			0,
			this.chat.findIndex((m) => m.date === message.date) + 1
		);
		ChatManagerService.createNewFromAnother(ChatManagerService.curId);
		this.saveChat(branchedChat);
		SocketClientService.onChatUpdate(branchedChat);
	};

	static get chat(): ChatMessage[] {
		let chat = JSON.parse(
			FileService.getDataFile(ChatManagerService.curDir + 'chat.txt') || '[]'
		);
		if (!chat?.length) {
			// just in case
			chat = [ChatManagerService.intro];
		}
		return chat;
	}
}
