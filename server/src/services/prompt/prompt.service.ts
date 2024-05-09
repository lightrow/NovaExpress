import { format, isSameDay, startOfDay } from 'date-fns';
import { ChatMessage } from '../../../../types';
import { Context } from '../../context';
import {
	createDirectionMessage,
	createNewMessage,
} from '../../lib/createNewMessage';
import { replaceTemplates } from '../../lib/replaceTemplates';
import { isDateBetweenTimes } from '../../util/isDateBetweenTimes';
import { AffinityService } from '../affinity/affinity.service';
import { Config } from '../config/config.service';
import { LlmService } from '../llm/llm.service';
import { MoodService } from '../mood/mood.service';
import { SocketClientService } from '../socket-client/socket.client.service';

export class PromptService {
	static injections: ((
		chatSlice: ChatMessage[],
		fullChat: ChatMessage[]
	) => Promise<void> | void)[] = [];

	static addPromptInjection = (fn: (typeof this.injections)[number]) => {
		this.injections.push(fn);
		return () => this.injections.splice(this.injections.indexOf(fn), 1);
	};

	static DAY_START_SHIFT = 6 * 60 * 60 * 1000; // assume day starts at 06:00AM, otherwise AI gets confused

	static buildPrompt = async (chat: ChatMessage[], recursive?: boolean) => {
		if (chat.length % Context.cutoffInterval === 0 && !recursive) {
			// Reset the cutoff params to let them be reevaluated anew.
			// Can only be done at time of context shift.
			this.setCutoffInterval(1000);
		}
		const chatFiltered = chat.filter((m) => m.state !== 'pruned');
		const cutoffIndex = Math.max(
			0,
			chatFiltered.length -
				(chatFiltered.length % Context.cutoffInterval) -
				Context.cutoffKeep
		);
		let chatSlice = chatFiltered.slice(cutoffIndex);
		console.info(
			`Adding last ${chatSlice.length} messages, starting from ${cutoffIndex}`
		);
		const pinnedMessages = chatFiltered.filter(
			(chatMessage) =>
				chatMessage.state === 'pinned' && !chatSlice.includes(chatMessage)
		);
		if (pinnedMessages.length) {
			console.info(`Adding ${pinnedMessages.length} pinned messages`);
			chatSlice = [...pinnedMessages, ...chatSlice];
		}

		for (const injection of this.injections) {
			// custom registerable injections
			await injection(chatSlice, chat);
		}
		this.injectSubprompts(chatSlice, chat);
		this.injectDayChangeMesssages(chatSlice);
		this.injectExample(chatSlice);
		this.injectSeparators(chatSlice);

		const formattedMessages = chatSlice.map((message, index) => {
			return this.promptifyMessage(
				message,
				index === chatSlice.length - 1,
				index === 0
			);
		});

		const prompt = replaceTemplates(
			Config.Template.replace('{{history}}', formattedMessages.join(''))
		);

		const tokens = await LlmService.tokenize(prompt);
		if (tokens.length >= Config.Chat.maxContext) {
			this.setCutoffInterval(
				Math.min(chatSlice.length, Context.cutoffInterval) - 20
			);
			if (Context.cutoffInterval <= 0) {
				this.setCutoffInterval(1000);
				console.error(
					`Not enough context to continue (current: ${Config.Chat.maxContext}). Try increasing maxContext or reduce system prompt size/amount of pinned messages.`
				);
				throw Error('OUT_OF_CONTEXT');
			}
			console.info(
				`Hit context limit, adjusting cutoff to: ${Context.cutoffInterval}/${Context.cutoffKeep} and retrying`
			);
			return this.buildPrompt(chat, true);
		}
		console.log('\n\n############### PROMPT #################\n\n');
		console.log(`PROMPT (${tokens.length}):...\n${prompt}`);
		SocketClientService.onCutoffPositionMeasured(cutoffIndex);

		return prompt;
	};

	static setCutoffInterval = (idx: number) => {
		Context.cutoffInterval = idx;
		Context.cutoffKeep = Math.floor(idx / 2);
	};

	static injectDayChangeMesssages(messages: ChatMessage[]) {
		for (let i = 0; i < messages.length; i++) {
			if (
				i === 0 ||
				!isSameDay(
					new Date(messages[i - 1].date - this.DAY_START_SHIFT),
					new Date(messages[i].date - this.DAY_START_SHIFT)
				)
			) {
				const todayMessage: ChatMessage = createDirectionMessage(
					'Today is ' + format(messages[i].date, 'do MMMM') + '.',
					startOfDay(messages[i].date).getTime() + this.DAY_START_SHIFT
				);
				messages.splice(i, 0, todayMessage);
				i++;
			}
		}
	}

	static injectExample = (chat: ChatMessage[]) => {
		if (Config.ExampleChat?.length) {
			chat = [...Config.ExampleChat, ...chat];
		}
	};

	static injectSeparators = (chat: ChatMessage[]) => {
		if (Config.TemplateFormat.nonInstructTemplate) {
			// Most models expect INPUT to be followed by OUTPUT. Because we
			// have more than two characters (Assistant, User, Narrator and
			// System Narrator), but only two roles (user and assistant, or
			// input and output), and one character can send multiple messages
			// in a row,  we have to "fix" situations with two inputs or two
			// outputs in a row. This may not immediately affect the model's
			// output quality, but somehow it feels wrong to leave it this way.

			// If you know your model doesn't care about it, e.g. llama3 header
			// ids apparently allow any role to be used instead of "user" and
			// "assistant", then you can use {{persona}} in your prefix and add
			// nonInstructTemplate: true

			// The below code ensures that input is always followed by output.
			// System messages are "typeless" - no idea if any model really supports system messages
			// outside of initial system prompt.
			return;
		}
		for (let index = chat.length - 1; index > 0; index--) {
			const message = chat[index];
			const previousMessage = chat[index - 1];

			const type = this.getMessageRole(message, index === chat.length - 1);
			const prevType = this.getMessageRole(previousMessage);

			// todo - concat messages if they are from the same persona instead of separating them.
			if (type === 'output' && prevType === 'output') {
				chat.splice(
					index,
					0,
					createNewMessage('user', '...', previousMessage.date + 1)
				);
			}
			if (
				(type === 'input' || type === 'system') &&
				(prevType === 'input' || prevType === 'system')
			) {
				chat.splice(
					index,
					0,
					createNewMessage('char', '...', previousMessage.date + 1)
				);
			}
		}
	};

	static getMessageRole = (message: ChatMessage, isLast?: boolean) => {
		if (isLast) {
			return 'output';
		}
		if (message.persona === 'user' || message.persona === 'narrator') {
			return 'input';
		}
		if (message.persona === 'char') {
			return 'output';
		}
		return 'system';
	};

	static promptifyMessage = (
		message: ChatMessage,
		isLast?: boolean,
		isFirst?: boolean
	) => {
		const role = this.getMessageRole(message, isLast);
		const tFormat = Config.TemplateFormat;

		const getXFix = (role: string, xfix: 'Suffix' | 'Prefix') => {
			let result = '';
			if (isFirst && role !== 'system') {
				// first system prompt is not a "message" and is handled elsewhere
				result = tFormat[`${role}First${xfix}`];
			} else if (isLast) {
				result = tFormat[`${role}Last${xfix}`] || '';
			}
			if (isLast && xfix === 'Suffix') {
				return result;
			}
			return result || tFormat[`${role}${xfix}`] || '';
		};

		const names = {
			user: Config.Chat.userName,
			char: Config.Chat.charName,
			narrator: Config.Chat.narratorName,
			system: Config.Chat.systemName,
		};
		const personaName = names[message.persona];

		const strings = [
			getXFix(role, 'Prefix'),
			message.messages[message.activeIdx],
			getXFix(role, 'Suffix'),
		];

		return strings
			.join('')
			.replace('{{persona}}', personaName)
			.replace('{{timestamp}}', format(message.date, 'hh:mma'));
	};

	static injectSubprompts = (
		chatSlice: ChatMessage[],
		fullChat: ChatMessage[]
	) => {
		const lastMessage = chatSlice.slice(-1)[0];
		const timeBasedPrompt = Object.entries(Config.Chat.time).find(
			([timeBracket]) => {
				const [start, end] = timeBracket.split('-');
				return isDateBetweenTimes(new Date(), start, end);
			}
		)?.[1];

		const moodPrompt = MoodService.generateNextMood(fullChat);

		const { prompt: affinityPrompt } =
			AffinityService.getAffinityPrompt(fullChat);

		const userPrompt =
			(lastMessage.persona === 'user' && Config.Chat.userPrompt) || '';

		const narratorPrompt =
			(lastMessage.persona === 'narrator' && Config.Chat.narratorPrompt) || '';

		const narratorSpecialPrompt =
			(lastMessage.persona === 'narrator' &&
				Context.isSpecialMode &&
				Config.Chat.narratorSpecialMode) ||
			'';

		const prompts = {
			common: Context.isSpecialMode ? [Config.Chat.specialModePromp] : [],
			narrator: Context.isSpecialMode
				? [narratorSpecialPrompt]
				: [narratorPrompt],
			char: Context.isSpecialMode
				? [Config.Chat.charPrompt]
				: [Config.Chat.charPrompt, timeBasedPrompt, moodPrompt, affinityPrompt],
			user: [userPrompt],
		};
		const promptStrings = Object.fromEntries(
			Object.entries(prompts)
				.map(([key, value]) => {
					return [
						key,
						value
							.filter((v) => v)
							.join(' ')
							.trim(),
					] as [string, string];
				})
				.filter(([_, value]) => value)
		);

		const insertPromptIntoChat = (promptString: string, position: number) => {
			if (!promptString) {
				return;
			}
			chatSlice.splice(
				chatSlice.length - position,
				0,
				createDirectionMessage(
					promptString,
					chatSlice[chatSlice.length - position - 1]?.date
				)
			);
		};

		insertPromptIntoChat(
			promptStrings.common,
			Config.Chat.otherPromptsPosition
		);

		insertPromptIntoChat(promptStrings.char, Config.Chat.charPromptPosition);

		insertPromptIntoChat(
			promptStrings.narrator,
			Config.Chat.narratorPromptPosition
		);

		insertPromptIntoChat(promptStrings.user, 1);
	};
}
