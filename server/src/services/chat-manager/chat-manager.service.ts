import { ChatListEntry, SocketServerEventEnum } from '../../../../types';
import { createNewMessage } from '../../lib/createNewMessage';
import { replaceTemplates } from '../../lib/replaceTemplates';
import { ChatService } from '../chat/chat.service';
import { Config } from '../config/config.service';
import { FileService } from '../fs/fs.service';
import { SocketClientService } from '../socket-client/socket.client.service';

export class ChatManagerService {
	static curId: number | null = null;

	static get curDir() {
		if (!this.curId || !this.checkChatExists(this.curId)) {
			this.loadInitialChat();
		}
		return '/chats/' + this.curId + '/';
	}

	static get intro() {
		return createNewMessage('narrator', replaceTemplates(Config.Intro));
	}

	static loadInitialChat = () => {
		let chatId = Number(FileService.getDataFile('/chats/lastActive.txt'));
		if (!this.checkChatExists(chatId)) {
			const chats = this.getListOfChats();
			if (chats.length && chats[0] && this.checkChatExists(chats[0])) {
				chatId = chats[0];
			}
		}
		this.loadChat(chatId);
	};

	static checkChatExists = (chatId: number) => {
		if (isNaN(chatId)) {
			return false;
		}
		return FileService.checkDataPathExists(`/chats/${chatId}`);
	};

	static loadChat = (chatId: number) => {
		if (!this.checkChatExists(chatId)) {
			chatId = new Date().getTime();
			this.curId = chatId; // must be set before creating files for intro templates to work
			this.createChatFiles(chatId);
		}

		FileService.writeToDataFile('/chats/lastActive.txt', String(chatId));
		this.curId = chatId;

		// order matters
		SocketClientService.onChatsListReceived(
			ChatManagerService.getChatsSummary()
		);
		SocketClientService.onChatUpdate(ChatService.chat);
	};

	static deleteChatFiles = (id: number) => {
		FileService.deleteDataDir(`/chats/${id}`);
		if (id === this.curId) {
			this.loadInitialChat();
		} else {
			SocketClientService.sendPayloadToClients({
				type: SocketServerEventEnum.CHATS_LIST,
				list: ChatManagerService.getChatsSummary(),
			});
		}
	};

	static createChatFiles = (id: number) => {
		FileService.mkDataDir(`/chats/${id}`);
		const fileNames = FileService.getDataDirContents('/chats/default');
		fileNames.forEach((fileName) => {
			FileService.cpDataFiles(
				`/chats/default/${fileName}`,
				`/chats/${id}/${fileName}`
			);
		});
		// cannot be called before curId is set because of replaceTemplates dependency on it
		FileService.writeToDataFile(
			`/chats/${id}/chat.txt`,
			JSON.stringify([this.intro])
		);
	};

	static createNewFromAnother = (idToCopyFrom: number) => {
		const id = new Date().getTime();
		FileService.cpDataFiles(`/chats/${idToCopyFrom}`, `/chats/${id}`);
		this.loadChat(id);
	};

	static getListOfChats = () => {
		const files = FileService.getDataDirContents('/chats');
		return files.map(Number).filter((f) => !isNaN(f));
	};

	static getChatDataFiles = (id: number | string) => {
		const files = FileService.getDataDirContents(`/chats/${id}`);
		return files;
	};

	static getChatsSummary = () => {
		const chatIds = ChatManagerService.getListOfChats();
		const chatsData = chatIds.map((id) => {
			const lastMessage = JSON.parse(
				FileService.getDataFile(`/chats/${id}/chat.txt`)
			).slice(-1)[0];
			const chatConfig = JSON.parse(
				FileService.getDataFile(`/chats/${id}/chatConfig.json`)
			);
			const system = FileService.getDataFile(`/chats/${id}/system.txt`).slice(
				100
			);
			const charAvatars = Object.fromEntries(
				Object.entries({
					default: 'char.png',
					affinity_1: 'char_1.png',
					affinity_2: 'char_2.png',
					affinity_3: 'char_3.png',
					affinity_4: 'char_4.png',
					affinity_5: 'char_5.png',
					special: 'char_special.png',
				})
					.filter(([_, filename]) =>
						FileService.checkDataPathExists(`/chats/${id}/${filename}`)
					)
					.map(([key, filename]) => [key, `/data/chats/${id}/${filename}`])
			);
			return {
				id: Number(id),
				active: Number(id) === this.curId,
				system,
				lastMessage,
				personas: [
					{
						role: 'char',
						name: chatConfig.charName,
						avatars: charAvatars,
					},
					{
						role: 'user',
						name: chatConfig.userName,
						avatars: { default: `/data/chats/${id}/user.png` },
					},
					{
						role: 'narrator',
						name: chatConfig.narratorName,
						avatars: { default: `/data/chats/${id}/narrator.png` },
					},
				],
			} as ChatListEntry;
		});
		return chatsData;
	};
}
