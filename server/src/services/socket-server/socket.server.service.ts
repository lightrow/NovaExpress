import ws from 'ws';
import { SocketEventEnum, SocketServerEventEnum } from '../../../../types';
import { Context } from '../../context';
import { generate } from '../../lib/generate';
import { maybeSanitizeMessages } from '../../lib/sanitizeMessages';
import { ChatActionsService } from '../chat-action/chatAction.service';
import { ChatManagerService } from '../chat-manager/chat-manager.service';
import { ChatService } from '../chat/chat.service';
import { LlmService } from '../llm/llm.service';
import { PatienceService } from '../patience/patience.service';
import { SocketClientService } from '../socket-client/socket.client.service';

export class SocketServerService {
	static connections: ws[] = [];

	static onClientConnect = (client: ws) => {
		this.connections.push(client);
		console.info(
			'new connection, active connections:',
			this.connections.length
		);
		const chat = ChatService.chat;
		PatienceService.isAway = false;
		client.send(
			JSON.stringify({
				type: SocketServerEventEnum.CHATS_LIST,
				list: ChatManagerService.getChatsSummary(),
			})
		);
		client.send(
			JSON.stringify({
				type: SocketServerEventEnum.MESSAGE_CHAT_RECEIVED,
				chat: maybeSanitizeMessages(chat),
			})
		);
		client.send(
			JSON.stringify({
				type: SocketEventEnum.TOGGLE_SPECIAL,
				value: Context.isSpecialMode,
			})
		);
		SocketClientService.sendPayloadToClients({
			type: SocketEventEnum.TOGGLE_AWAY,
			value: PatienceService.isAway,
		});
	};

	static onClose = (client: ws) => {
		this.connections.splice(
			this.connections.findIndex((w) => client === w),
			1
		);
		PatienceService.isAway = !this.connections.length;
		console.info(
			'connection closed, remaining connections:',
			this.connections.length
		);
	};

	static onMessage = (rawPayload: ws.RawData) => {
		PatienceService.beginAutoTriggerCountdown();

		const payload = JSON.parse(rawPayload.toString());

		console.info('Received: ' + payload.type);
		switch (payload.type as SocketEventEnum) {
			case SocketEventEnum.TOGGLE_SPECIAL:
				ChatActionsService.narrateSystemAndMaybeTrigger(
					payload.value
						? '{{user}} has entered {{special}}.'
						: '{{user}} has left {{special}}.'
				);
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
				generate(ChatService.chat);
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
				ChatManagerService.deleteChatFiles(payload.chatId);
				break;
			case SocketEventEnum.LOAD_CHAT:
				ChatManagerService.loadChat(payload.chatId);
				break;
			case SocketEventEnum.TOGGLE_AWAY:
				PatienceService.isAway = payload.value;
				break;
		}
	};
}
