import { format, isSameDay, startOfDay } from 'date-fns';
import { ChatMessage } from '../../../../types';
import { Context } from '../../context';
import { createNewMessage } from '../../lib/createNewMessage';
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

	static buildPrompt = async (chat: ChatMessage[]) => {
		if (chat.length % Context.cutoffInterval === 0) {
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

		this.injectSubprompts(chatSlice, chat);
		this.injectDayChangeMesssages(chatSlice);
		this.injectExample(chatSlice);
		this.injectSeparators(chatSlice);

		for (const injection of this.injections) {
			// custom registerable injections
			await injection(chatSlice, chat);
		}

		const formattedMessages = chatSlice.map((message, index) => {
			return this.promptifyMessage(message, index === chatSlice.length - 1);
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
			return this.buildPrompt(chat);
		}
		console.log('\n\n############### PROMPT #################\n\n');
		console.log(`PROMPT (${tokens.length}):...\n${prompt.slice()}`);
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
				const todayMessage: ChatMessage = createNewMessage(
					'user',
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
			// have more than two characters (Narrator), but only two roles
			// (assistant and user), we have to "fix" situations when narrator
			// speaks before or after someone, resulting in two inputs or two
			// outputs in a row, depending on whether Narrator is assigned as
			// output or input. This may not immediately affect the model's
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

			const type = this.getMessageType(message, index === chat.length - 1);
			const prevType = this.getMessageType(previousMessage);

			if (type === 'output' && prevType === 'output') {
				chat.splice(
					index,
					0,
					createNewMessage('user', '...', previousMessage.date + 1)
				);
			}
			if (type === 'input' && prevType === 'input') {
				chat.splice(
					index,
					0,
					createNewMessage('char', '...', previousMessage.date + 1)
				);
			}
		}
	};

	static getMessageType = (message: ChatMessage, isLast?: boolean) => {
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

	static promptifyMessage = (message: ChatMessage, isLast?: boolean) => {
		const messageType = this.getMessageType(message, isLast);

		const prefix =
			(isLast && Config.TemplateFormat[`${messageType}LastPrefix`]) ||
			Config.TemplateFormat[`${messageType}Prefix`];
		const suffix = Config.TemplateFormat[`${messageType}Suffix`];

		const name = {
			user: Config.Chat.userName,
			char: Config.Chat.charName,
			narrator: Config.Chat.narratorName,
			system: Config.Chat.systemName,
		}[message.persona];

		const strings = [
			prefix,
			message.persona !== 'system' ? Config.Chat.messagePrefixTemplate : '',
			message.messages[message.activeIdx],
			isLast ? '' : suffix,
		];

		return strings
			.join('')
			.replace('{{persona}}', name)
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

		let prompts = {
			common: Context.isSpecialMode ? [Config.Chat.specialModePromp] : [],
			narrator: Context.isSpecialMode
				? [narratorSpecialPrompt]
				: [narratorPrompt],
			char: Context.isSpecialMode
				? [Config.Chat.charPrompt]
				: [Config.Chat.charPrompt, timeBasedPrompt, moodPrompt, affinityPrompt],
			user: [userPrompt],
		};
		prompts = Object.fromEntries(
			Object.entries(prompts).filter(([_, value]) => !!value.join(''))
		) as typeof prompts;

		const formatAsDirection = (prompt: string) =>
			Config.Chat.directionTemplate.replace('{{direction}}', prompt);

		prompts.common &&
			chatSlice.splice(
				chatSlice.length - Config.Chat.otherPromptsPosition,
				0,
				createNewMessage(
					'user',
					formatAsDirection(prompts.common.join(' ')),
					chatSlice[chatSlice.length - Config.Chat.otherPromptsPosition - 1]
						?.date
				)
			);
		prompts.char &&
			chatSlice.splice(
				chatSlice.length - Config.Chat.charPromptPosition,
				0,
				createNewMessage(
					'user',
					formatAsDirection(prompts.char.join(' ')),
					chatSlice[chatSlice.length - Config.Chat.charPromptPosition - 1]?.date
				)
			);
		prompts.narrator &&
			chatSlice.splice(
				chatSlice.length - Config.Chat.narratorPromptPosition,
				0,
				createNewMessage(
					'user',
					formatAsDirection(prompts.narrator.join(' ')),
					chatSlice[chatSlice.length - Config.Chat.narratorPromptPosition - 1]
						?.date
				)
			);
		prompts.user &&
			chatSlice.splice(
				chatSlice.length - 1,
				0,
				createNewMessage(
					'user',
					formatAsDirection(prompts.user.join(' ')),
					chatSlice[chatSlice.length - 2]?.date
				)
			);

		// 	const notebook: ChatMessage = {
		// 		persona: 'narrator',
		// 		date: new Date().getTime(),
		// 		message: `*{{user}}'s notebook lies open on his table:*
		// Today is {{date}}, {{weekday}}.
		// {{notebookUser}}
		// {{notebookChar}}`,
		// 	};

		// 	c.splice(c.length - 5, 0, notebook);
	};
}
