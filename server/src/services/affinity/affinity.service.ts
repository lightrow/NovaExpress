import { ChatMessage } from '../../../../types';
import { Context } from '../../context';
import { Config } from '../config/config.service';

export class AffinityService {
	static AFFINITY_HALF_LIFE = 60 * 60 * 2;
	static AFFINITY_PER_INTERACTION_MIN = 0;
	static AFFINITY_PER_INTERACTION_MAX = 4;
	static BREAKDOWN_THRESHOLD = 3;
	static SPECIAL_MODE_FIXED_AMOUNT = 100;
	static INTERACTION_BONUSES = [
		{ amount: 5, keywords: ['pat|rub', 'head|ear|shoulder|back'] },
	];

	static lastAffinity: {
		amount: number;
		date: number;
	} | null = null; // todo - save in chat instead

	static getAffinityPrompt = (chat: ChatMessage[]) => {
		const affinity = this.getAffinityFromChat(chat);
		return {
			affinity,
			prompt: (() => {
				if (affinity > 90) {
					return Config.Chat.affinity.veryhigh;
				}
				if (affinity > 70) {
					return Config.Chat.affinity.high;
				}
				if (affinity > 50) {
					return Config.Chat.affinity.normal;
				}
				if (affinity > 20) {
					return Config.Chat.affinity.low;
				}
				if (affinity > this.BREAKDOWN_THRESHOLD) {
					return Config.Chat.affinity.critical;
				}
				return Config.Chat.affinity.broken;
			})().replace('$level', affinity.toString()),
		};
	};

	static getAffinityFromMessage = (message: string) => {
		const randomAmount = Math.floor(
			Math.random() *
				(this.AFFINITY_PER_INTERACTION_MAX -
					this.AFFINITY_PER_INTERACTION_MIN +
					1) +
				this.AFFINITY_PER_INTERACTION_MIN
		);
		const bonus = this.INTERACTION_BONUSES.find((bonus) => {
			const matchingAllKeywordPairs =
				bonus.keywords.filter((keywords) => {
					const regexp = new RegExp(`(${keywords})`, 'gi');
					if (message.match(regexp)) {
						return false;
					}
				}).length === 0;
			if (matchingAllKeywordPairs) {
				return true;
			}
		});
		const total = randomAmount + (bonus?.amount || 0);
		return total;
	};

	static calculateRemainingAffinity = (
		initialAffinity: { amount: number; date: number },
		affinityAdditions: { amount: number; date: number }[],
		currentDate: number
	) => {
		if (Context.isSpecialMode) {
			return this.SPECIAL_MODE_FIXED_AMOUNT;
		}
		const timePassed = (currentDate - initialAffinity.date) / 1000; // Convert milliseconds to seconds
		let remainingAffinity = initialAffinity.amount;

		// Calculate decay constant
		const decayConstant = Math.log(2) / this.AFFINITY_HALF_LIFE;

		// Apply exponential decay
		remainingAffinity *= Math.exp(-decayConstant * timePassed);

		// Adjust for additional affinity added at known dates
		for (const addition of affinityAdditions) {
			const additionTimePassed = (currentDate - addition.date) / 1000; // Convert milliseconds to seconds
			const additionalAffinity =
				addition.amount * Math.exp(-decayConstant * additionTimePassed);
			remainingAffinity += additionalAffinity;
		}

		return Math.min(100, Math.round(remainingAffinity));
	};

	static calculateFromStart = (chat: ChatMessage[]) => {
		if (chat.slice(-1)[0]?.affinity) {
			this.lastAffinity = {
				amount: chat.slice(-1)[0].affinity,
				date: chat.slice(-1)[0]?.date,
			};
			return;
		}
		const firstDate = chat[0].date;
		const lastDate = chat.slice(-1)[0].date;
		this.lastAffinity = {
			amount: 100,
			date: firstDate,
		};
		const remaining = this.calculateRemainingAffinity(
			this.lastAffinity,
			chat
				.filter((m) => m.persona === 'user')
				.map((m) => ({
					amount: this.getAffinityFromMessage(m.messages[m.activeIdx]),
					date: m.date,
				})),
			lastDate
		);
		this.lastAffinity = {
			amount: remaining,
			date: lastDate,
		};
	};

	static calculateForNewMessages = (newMessages: ChatMessage[]) => {
		if (!newMessages.length) {
			return;
		}
		const lastDate = newMessages.slice(-1)[0].date;
		const remaining = this.calculateRemainingAffinity(
			this.lastAffinity,
			newMessages
				.filter((m) => m.persona === 'user')
				.map((m) => ({
					amount: this.getAffinityFromMessage(m.messages[m.activeIdx]),
					date: m.date,
				})),
			lastDate
		);
		this.lastAffinity = {
			amount: remaining,
			date: lastDate,
		};
	};

	static getAffinityFromChat = (chat: ChatMessage[]) => {
		if (!this.lastAffinity) {
			this.calculateFromStart(chat);
		} else {
			const newMessages = chat.filter(
				(message) => message.date > this.lastAffinity.date
			);
			this.calculateForNewMessages(newMessages);
		}

		return this.lastAffinity.amount;
	};
}
