import ws from 'ws';
import { SocketEventEnum, SocketServerEventEnum } from '../../../../types';
import { generate } from '../../lib/generate';
import { replaceTemplates } from '../../lib/replaceTemplates';
import { maybeSanitizeMessages } from '../../lib/sanitizeMessages';
import { AutoMessageService } from '../auto-message/auto-message.service';
import { ChatService } from '../chat/chat.service';
import { LlmService } from '../llm/llm.service';
import { Context } from '../../context';

export class SocketServerService {
	static connections: ws[] = [];

	static onClientConnect = (client: ws) => {
		this.connections.push(client);
		console.info(
			'new connection, active connections:',
			this.connections.length
		);
		const chat = ChatService.currentChat;
		const chatsList = ChatService.getListOfChats();

		client.send(
			JSON.stringify({
				type: SocketServerEventEnum.MESSAGE_CHAT_RECEIVED,
				chat: maybeSanitizeMessages(chat),
			})
		);
		client.send(
			JSON.stringify({
				type: SocketServerEventEnum.CHATS_LIST,
				list: chatsList,
			})
		);
		client.send(
			JSON.stringify({
				type: SocketEventEnum.TOGGLE_SPECIAL,
				value: Context.isSpecialMode,
			})
		);
	};

	static onClose = (client: ws) => {
		this.connections.splice(
			this.connections.findIndex((w) => client === w),
			1
		);
		console.info(
			'connection closed, remaining connections:',
			this.connections.length
		);
	};

	static onMessage = (rawPayload: ws.RawData) => {
		AutoMessageService.beginAutoTriggerCountdown();

		const payload = JSON.parse(rawPayload.toString());

		if (payload.message?.message) {
			payload.message.message = replaceTemplates(payload.message.message);
		}

		console.info('Received: ' + payload.type);
		switch (payload.type as SocketEventEnum) {
			case SocketEventEnum.TOGGLE_SPECIAL:
				Context.isSpecialMode = payload.value;
				break;
			case SocketEventEnum.ADD_MESSAGE_NO_REPLY:
				ChatService.addMessage(payload.message);
				break;
			case SocketEventEnum.ADD_MESSAGE_AND_REPLY:
				ChatService.addMessageAndReply(payload.message);
				break;
			case SocketEventEnum.ADD_MESSAGE_AND_CONTINUE:
				ChatService.addMessageAndContinue(payload.message);
				break;
			case SocketEventEnum.CONTINUE:
				generate(ChatService.currentChat);
				break;
			case SocketEventEnum.RETRY:
				ChatService.retry();
				break;
			case SocketEventEnum.STOP:
				LlmService.stopInference();
				break;
			case SocketEventEnum.CUT:
				ChatService.cut(payload);
				break;
			case SocketEventEnum.PRUNE:
				ChatService.pruneUnpinned();
				break;
			case SocketEventEnum.DELETE_MESSAGE:
				ChatService.deleteMessage(payload.message);
				break;
			case SocketEventEnum.EDIT_MESSAGE:
				ChatService.editMessage(payload.message);
				break;
			case SocketEventEnum.BRANCH_AT_MESSAGE:
				ChatService.branchChat(payload.message);
				break;
			case SocketEventEnum.DELETE_CHAT:
				ChatService.deleteChat(payload.chatId);
				break;
			case SocketEventEnum.LOAD_CHAT:
				ChatService.loadChat(payload.chatId);
				break;
		}
	};
}
