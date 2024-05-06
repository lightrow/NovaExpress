import { ChatMessage } from '../../../types';
import { ChatService } from '../services/chat/chat.service';
import { LlmService } from '../services/llm/llm.service';
import { NotebookService } from '../services/notebook/notebook.service';
import { PromptService } from '../services/prompt/prompt.service';
import { SocketClientService } from '../services/socket-client/socket.client.service';
import { SocketServerService } from '../services/socket-server/socket.server.service';
import { BusEventEnum, EventBus } from './eventBus';
import { maybeSanitizeMessages } from './sanitizeMessages';
import { sendPush } from './sendPush';

// maybe there is a better way, but this seems most reliable so far
let processing = false;

export const generate = async (chat: ChatMessage[]) => {
	if (processing) {
		return;
	}
	processing = true;

	const message = chat.slice(-1)[0];
	const id = message.date;
	const idx = message.activeIdx;
	try {
		const prompt = await PromptService.buildPrompt(maybeSanitizeMessages(chat));

		const handleChunk = (chunk: string) => {
			ChatService.updateMessageWithChunk(id, chunk);
		};

		await LlmService.sendPrompt(prompt, handleChunk);
		const promptMessage = ChatService.chat.find((m) => m.date === id);
		EventBus.send({
			key: BusEventEnum.MESSAGE_UPDATED,
			data: promptMessage,
		});
		if (!SocketServerService.connections.length) {
			console.info('No connections, sending push...');
			sendPush(promptMessage);
		}
		NotebookService.parseAndUpdateNotebook(promptMessage);
		SocketClientService.onStreamEnded();
		processing = false;
	} catch (error) {
		console.error(error);
		const promptMessage = ChatService.chat.find((m) => m.date === id);
		if (promptMessage.messages[idx] === '') {
			promptMessage.messages.splice(idx, 1);
			promptMessage.activeIdx = promptMessage.messages.length - 1;
			if (!promptMessage.messages.length) {
				ChatService.deleteMessage(promptMessage);
			} else {
				ChatService.editMessage(promptMessage);
			}
		}
		SocketClientService.onStreamEnded();
		processing = false;
	}
};
