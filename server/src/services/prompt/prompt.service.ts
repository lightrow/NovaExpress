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
import _ from 'lodash';
import { NotebookService } from '../notebook/notebook.service';

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
		if (chat.length <= Context.cutoffIndex) {
			// Reset the cutoff params to let them be reevaluated anew.
			// Can only be done at time of context shift.
			this.setCutoffIndex(0);
		}
		const chatFiltered = chat.filter((m) => m.state !== 'pruned');

		let chatSlice = _.cloneDeep(chatFiltered.slice(Context.cutoffIndex));
		console.info(
			`Adding last ${chatSlice.length} messages, starting from ${Context.cutoffIndex}`
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
			return this.promptifyMessage(message, index === chatSlice.length - 1);
		});

		const prompt = replaceTemplates(
			Config.Template.replace('{{history}}', formattedMessages.join(''))
		);

		const tokens = await LlmService.tokenize(prompt);
		if (tokens.length >= Config.Chat.maxContext) {
			const offset = Context.cutoffIndex + Math.floor(chatSlice.length / 2);
			this.setCutoffIndex(offset);
			if (offset === 0) {
				console.error(
					`Not enough context to continue (current: ${Config.Chat.maxContext}). Try increasing maxContext or reduce system prompt size/amount of pinned messages.`
				);
				throw Error('OUT_OF_CONTEXT');
			}
			console.info(
				`Hit context limit, adjusting cutoff to: ${Context.cutoffIndex} and retrying`
			);
			return this.buildPrompt(chat, true);
		}
		console.log('\n\n############### PROMPT #################\n\n');
		console.log(`PROMPT (${tokens.length}):...\n${prompt}`);
		SocketClientService.onCutoffPositionMeasured(Context.cutoffIndex);

		return prompt;
	};

	static setCutoffIndex = (idx: number) => {
		Context.cutoffIndex = idx;
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
					'Today is ' + format(messages[i].date, 'cccc do MMMM') + '.',
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
		if (!Config.TemplateFormat.maintainInputOutputSequence) {
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
					createNewMessage('system', '(Continue.)', previousMessage.date + 1)
				);
			}
			if (
				(type === 'input' || type === 'system') &&
				(prevType === 'input' || prevType === 'system')
			) {
				chat.splice(
					index,
					0,
					createNewMessage('char', '(Understood.)', previousMessage.date + 1)
				);
			}
		}
	};

	static getMessageRole = (message: ChatMessage, isLast?: boolean) => {
		if (isLast) {
			return 'output';
		}
		if (!Config.TemplateFormat.chatFormat) {
			return '';
		}
		switch (message.persona) {
			case 'char':
				return 'output';
			case 'user':
				return 'input';
			case 'narrator':
				return Config.TemplateFormat.narratorRole || 'output';
			case 'system':
				return Config.TemplateFormat.directionRole || 'input';
		}
	};

	static promptifyMessage = (
		message: ChatMessage,
		isLast?: boolean,
		noRoles?: boolean
	) => {
		const role = this.getMessageRole(message, isLast);

		const getXFix = (
			role: string,
			persona: ChatMessage['persona'],
			xfix?: 'Suffix' | 'Prefix',
			direction?: string
		) => {
			if (isLast && xfix === 'Suffix') {
				return '';
			}

			const getConfigValue = (type: string, xfix: string) => {
				if (isLast) {
					return (
						Config.TemplateFormat[`${type}Last${xfix}`] ||
						Config.TemplateFormat[`${type}${xfix}`] ||
						''
					);
				}
				return Config.TemplateFormat[`${type}${xfix}`] || '';
			};

			const personaXfix =
				(() => {
					const msg = message.messages[message.activeIdx];
					if (msg === '(Continue.)' || msg === '(Understood.)') {
						return '';
					}
					switch (persona) {
						case 'user':
						case 'char':
							return getConfigValue('persona', xfix);
						case 'narrator':
							return getConfigValue('narrator', xfix);
						case 'system':
							return getConfigValue('direction', xfix);
						default:
							return '';
					}
				})() ?? '';
			const roleXfix =
				(() => {
					switch (role) {
						case 'input':
							return getConfigValue('input', xfix);
						case 'output':
							return getConfigValue('output', xfix);
						case 'system':
							return getConfigValue('system', xfix);
					}
				})() ?? '';
			if (xfix === 'Suffix') {
				return personaXfix + (noRoles ? '' : roleXfix);
			}
			return (
				(noRoles ? '' : roleXfix) +
				(direction
					? Config.Chat.directionTemplate.replace('{{direction}}', direction) +
					  ' '
					: '') +
				personaXfix
			);
		};

		const names = {
			user: Config.Chat.userName,
			char: Config.Chat.charName,
			narrator: Config.Chat.narratorName,
			system: Config.Chat.systemName,
		};
		const personaName = names[message.persona];

		const strings = [
			getXFix(role, message.persona, 'Prefix', message.direction),
			message.messages[message.activeIdx],
			getXFix(role, message.persona, 'Suffix'),
		];

		return strings
			.join('')
			.replace(/{{persona}}/g, personaName)
			.replace(/{{timestamp}}/g, format(message.date, 'hh:mma'));
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
			common: Context.isSpecialMode
				? [Config.Chat.specialModePromp]
				: [
						'{{user}} is not in {{special}}. {{char}} cannot interact with {{user}} physically.',
						timeBasedPrompt,
						moodPrompt,
						affinityPrompt,
				  ],
			narrator: Context.isSpecialMode
				? [narratorSpecialPrompt]
				: [narratorPrompt],
			char: [lastMessage.persona === 'char' ? Config.Chat.charPrompt : null],
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

		const insertDirectionIntoChat = (
			promptString: string,
			position: number
		) => {
			if (!promptString) {
				return;
			}
			const idx = Math.max(0, chatSlice.length - 1 - position);
			chatSlice[idx].direction =
				(chatSlice[idx].direction || '').trim() +
				(chatSlice[idx].direction ? ' ' : '') +
				promptString.trim();
		};

		insertDirectionIntoChat(
			promptStrings.common,
			Config.Chat.otherPromptsPosition
		);

		insertDirectionIntoChat(promptStrings.char, Config.Chat.charPromptPosition);

		insertDirectionIntoChat(
			promptStrings.narrator,
			Config.Chat.narratorPromptPosition
		);

		insertDirectionIntoChat(promptStrings.user, 1);

		insertDirectionIntoChat(
			NotebookService.Notebook,
			Config.Chat.notebookPosition
		);
	};
}
