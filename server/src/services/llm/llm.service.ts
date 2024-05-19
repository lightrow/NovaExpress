import { Agent, fetch, RequestInit, setGlobalDispatcher } from 'undici';
import wait from '../../util/wait';
import { Config } from '../config/config.service';
import { replaceTemplates } from '../../lib/replaceTemplates';
import { PromptService } from '../prompt/prompt.service';
import { maybeSanitizeMessages } from '../../lib/sanitizeMessages';
import { ChatMessage } from '../../../../types';
import { CohereClient } from 'cohere-ai';

const cohere = new CohereClient({
	token: '<<api_key>>',
});

setGlobalDispatcher(new Agent({ bodyTimeout: 1_200_000 }));

export class LlmService {
	static abortController: AbortController;

	// not good
	static sendPromptCohere = async (
		chat: ChatMessage[],
		onContentChunkReceived: (chunk: string) => void
	) => {
		const getRole = (persona: string) =>
			((
				{
					user: 'USER',
					char: 'CHATBOT',
					narrator: 'CHATBOT',
					system: 'USER',
				} as const
			)[persona]);

		const lastMessage = chat.slice(-1)[0];

		const history = chat.slice(0, -1).map((m) => ({
			role: getRole(m.persona),
			message: PromptService.promptifyMessage(m, false, true),
		}));

		const last = PromptService.promptifyMessage(lastMessage, true, true);

		const chatStream = await cohere.chatStream({
			chatHistory: history,
			message: last,
		});

		for await (const message of chatStream) {
			if (message.eventType === 'text-generation') {
				onContentChunkReceived(message.text);
			}
		}
	};

	static sendPromptLlamaCpp = async (
		prompt: string,
		onContentChunkReceived: (chunk: string) => void
	) => {
		console.info('Generating...');
		if (this.abortController) {
			this.stopInference();
			console.info('Aborting previous...');
			await wait(2000);
		}
		this.abortController = new AbortController();
		const options: RequestInit = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			signal: this.abortController.signal,
		};

		const payload = { ...Config.Llm };
		payload.prompt = prompt;
		payload.stop = payload.stop.map((s) => replaceTemplates(s));
		options.body = JSON.stringify(payload);

		try {
			const res = await fetch(Config.Urls.urlGenerate, options);
			console.info('Got res, preparing to read stream...');
			const reader = res.body.getReader();
			const decoder = new TextDecoder('utf-8');

			while (true) {
				if (!this.abortController) {
					reader.cancel();
				} else {
					const { value, done } = await reader.read();
					if (done) {
						break;
					}
					const chunk = decoder.decode(value);
					if (chunk.startsWith('data')) {
						try {
							if (chunk.includes('"stop":true')) {
								break;
							}
							const content = JSON.parse(chunk.replace('data: ', '')).content;
							onContentChunkReceived(content);
						} catch (error) {
							if (error.message === 'CHUNK_UPDATE_FAIL') {
								throw error;
							}
							console.warn('Parse gen data error: ', error);
						}
					}
				}
			}
			this.abortController = null;
		} catch (error) {
			this.abortController = null;
			console.warn('Generate error');
			throw error;
		}
	};

	static sendPrompt = async (
		chat: ChatMessage[],
		onContentChunkReceived: (chunk: string) => void
	) => {
		//this.sendPromptCohere(chat, onContentChunkReceived);
		const prompt = await PromptService.buildPrompt(maybeSanitizeMessages(chat));
		await this.sendPromptLlamaCpp(prompt, onContentChunkReceived);
	};

	static stopInference = () => {
		try {
			this.abortController?.abort();
			this.abortController = null;
		} catch (error) {
			console.warn('Abort error:', error);
		}
	};

	static tokenize = async (content: string) => {
		try {
			const res = await fetch(Config.Urls.urlTokenize, {
				method: 'POST',
				body: JSON.stringify({
					content,
				}),
			});
			const data = (await res.json()) as { tokens: number[] };
			return data.tokens;
		} catch (error) {
			console.warn('Tokenization failed');
			return [];
		}
	};

	static detokenize = async (tokens: number[]) => {
		try {
			const res = await fetch(Config.Urls.urlDetokenize, {
				method: 'POST',
				body: JSON.stringify({
					tokens,
				}),
			});
			const data = (await res.json()) as string;
			return data;
		} catch (error) {
			console.warn('Detokenization failed');
			return '';
		}
	};
}
