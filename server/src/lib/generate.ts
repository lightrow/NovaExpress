import { ChatMessage } from '../../../types';
import { ChatService } from '../services/chat/chat.service';
import { LlmService } from '../services/llm/llm.service';
import { SocketClientService } from '../services/socket-client/socket.client.service';
import { SocketServerService } from '../services/socket-server/socket.server.service';
import { BusEventEnum, EventBus } from './eventBus';
import { sendPush } from './sendPush';
import { splitMessageFromInsights } from './splitMessageFromInsights';

// maybe there is a better way, but this seems most reliable so far
let processing = false;

export const generate = async (chat: ChatMessage[]) => {
	const message = chat.slice(-1)[0];
	const id = message.date;
	const idx = message.activeIdx;

	try {
		if (processing) {
			throw Error('BUSY');
		}
		processing = true;

		const handleChunk = (chunk: string) => {
			try {
				ChatService.updateMessageWithChunk(id, chunk);
			} catch (error) {
				throw Error('CHUNK_UPDATE_FAIL');
			}
		};

		handleChunk('');

		await LlmService.sendPrompt(chat, handleChunk);
		const promptMessage = ChatService.chat.find((m) => m.date === id);
		EventBus.send({
			key: BusEventEnum.MESSAGE_UPDATED,
			data: promptMessage,
		});
		if (!SocketServerService.connections.length) {
			console.info('No connections, sending push...');
			sendPush(promptMessage);
		}
		ChatService.updateMessageWithChunk(id, '', true);
		SocketClientService.onStreamEnded();
		processing = false;
	} catch (error) {
		const promptMessage = ChatService.chat.find((m) => m.date === id);
		try {
			const { text } = splitMessageFromInsights(promptMessage.messages[idx]);
			if (text === '') {
				promptMessage.messages.splice(idx, 1);
				promptMessage.activeIdx = promptMessage.messages.length - 1;
				if (!promptMessage.messages.length) {
					ChatService.deleteMessage(promptMessage);
				} else {
					ChatService.editMessage(promptMessage);
				}
			}
		} catch (err) {
			ChatService.deleteMessage(promptMessage);
		}
		SocketClientService.onStreamEnded();
		processing = false;
	}
};
