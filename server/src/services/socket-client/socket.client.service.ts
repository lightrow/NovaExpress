import {
	ChatListEntry,
	ChatMessage,
	SocketEventEnum,
	SocketServerEventEnum,
} from '../../../../types';
import { maybeSanitizeMessages } from '../../lib/sanitizeMessages';
import { PromptService } from '../prompt/prompt.service';
import { SocketServerService } from '../socket-server/socket.server.service';

export class SocketClientService {
	static sendPayloadToClients = (payload: object) => {
		SocketServerService.connections.forEach((connection) =>
			connection.send(JSON.stringify(payload))
		);
	};

	static onStreamEnded = () => {
		this.sendPayloadToClients({
			type: SocketServerEventEnum.STREAM_END,
		});
	};

	static onSpecialToggle = (val: boolean) => {
		this.sendPayloadToClients({
			type: SocketEventEnum.TOGGLE_SPECIAL,
			value: val,
		});
	};

	static onMessageReceived = (payload: ChatMessage) => {
		this.sendPayloadToClients({
			type: SocketServerEventEnum.MESSAGE_RECEIVED,
			message: payload,
		});
	};

	static onMessageChunkReceived = (payload: ChatMessage) => {
		this.sendPayloadToClients({
			type: SocketServerEventEnum.MESSAGE_CHUNK_RECEIVED,
			message: maybeSanitizeMessages([payload])[0],
		});
	};

	static onChatUpdate = (payload: ChatMessage[]) => {
		this.sendPayloadToClients({
			type: SocketServerEventEnum.MESSAGE_CHAT_RECEIVED,
			chat: maybeSanitizeMessages(payload),
		});
		// we no longer know, until next prompt.
		PromptService.setCutoffIndex(0);
		this.onCutoffPositionMeasured(0);
	};

	static onMessageDeleted = (message: ChatMessage) => {
		this.sendPayloadToClients({
			type: SocketServerEventEnum.MESSAGE_DELETED,
			message: message,
		});
	};

	static onCutoffPositionMeasured = (cutoffPosition: number) => {
		this.sendPayloadToClients({
			type: SocketServerEventEnum.CUTOFF_POSITION,
			position: cutoffPosition,
		});
	};

	static onChatsListReceived = (chatsList: ChatListEntry[]) => {
		this.sendPayloadToClients({
			type: SocketServerEventEnum.CHATS_LIST,
			list: chatsList,
		});
	};
}
