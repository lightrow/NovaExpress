import { ChatMessage } from '../../../../types';
import { createNewMessage } from '../../lib/createNewMessage';
import { replaceTemplates } from '../../lib/replaceTemplates';
import { getRandomBetween } from '../../util/getRandomBetween';
import { isDateBetweenTimes } from '../../util/isDateBetweenTimes';
import { yesOrNo } from '../../util/maybe';
import { ChatActionsService } from '../chat-action/chatAction.service';
import { ChatService } from '../chat/chat.service';
import { Config } from '../config/config.service';
import { FileService } from '../fs/fs.service';
import { PromptService } from '../prompt/prompt.service';

export class PatienceServiceFactory {
	constructor() {
		PromptService.addPromptInjection(this.checkInjectPatiencePrompt);
		this.listenToEvent();
		this.beginAutoTriggerCountdown();
	}

	LONG_WAIT_MIN = 30 * 60 * 1000;
	LONG_WAIT_MAX = 70 * 60 * 1000;
	SHORT_WAIT_MIN = 3 * 60 * 1000;
	SHORT_WAIT_MAX = 9 * 60 * 1000;

	MAX_SKIPS_TO_WAIT_WHEN_AWAY = 7;
	MAX_TRIGGERS_MORNING = 2;

	MORNING_END_TIME = '9:30';
	START_TIME = '7:00';
	END_TIME = '22:00';
	EVENT_FILE = 'event.txt';

	autoTriggerTimeout = null;
	isAway = false;

	checkInjectPatiencePrompt = (
		chatSlice: ChatMessage[],
		fullChat: ChatMessage[]
	) => {
		if (!Config.Chat.enablePatience) {
			return;
		}
		const count = this.calculateIgnoredMessagesCount(fullChat);
		if (count === 0 || chatSlice.slice(-1)[0].persona !== 'char') {
			return;
		}
		chatSlice.splice(
			chatSlice.length - 1,
			0,
			createNewMessage(
				'system',
				Config.Chat.directionTemplate.replace(
					'{{direction}}',
					(
						Config.Chat.patience?.default ||
						"{{user}} hasn't responded to {{char}} {{count}} times."
					).replace('{{count}}', count)
				)
			)
		);
	};

	calculateIgnoredMessagesCount = (chat: ChatMessage[]) => {
		let ignoredMessagesCount = 0;
		for (let index = chat.length - 2; index > 0; index--) {
			const message = chat[index];
			if (message.persona === 'char') {
				ignoredMessagesCount++;
			} else {
				if (message.persona === 'system') {
					continue;
				}
				if (message.persona !== 'narrator') {
					continue;
				}
				break;
			}
		}
		return ignoredMessagesCount;
	};

	get isAsleep() {
		return (
			isDateBetweenTimes(new Date(), this.END_TIME, this.START_TIME) &&
			this.isAway
		);
	}

	get isMorningTime() {
		return isDateBetweenTimes(
			new Date(),
			this.START_TIME,
			this.MORNING_END_TIME
		);
	}

	runPatienceCheck = (cycle: number) => {
		const isLong = cycle === 0 ? true : cycle === 1 ? false : yesOrNo();

		const longTimeout = getRandomBetween(
			this.LONG_WAIT_MIN,
			this.LONG_WAIT_MAX
		);
		const shortTimeout = getRandomBetween(
			this.SHORT_WAIT_MIN,
			this.SHORT_WAIT_MAX
		);
		const timeout = isLong ? longTimeout : shortTimeout;

		clearTimeout(this.autoTriggerTimeout);
		this.autoTriggerTimeout = setTimeout(() => {
			if (this.isAsleep) {
				// do not allow at night
				console.info('{{user}} is sleeping');
				this.beginAutoTriggerCountdown();
				return;
			}
			if (this.isMorningTime && cycle > this.MAX_TRIGGERS_MORNING) {
				// only allow to bother MAX_TRIGGERS_MORNING times in the morning
				console.info('{{user}} is waking up');
				return;
			}
			if (
				this.isAway &&
				(cycle < this.MAX_SKIPS_TO_WAIT_WHEN_AWAY ||
					cycle % this.MAX_SKIPS_TO_WAIT_WHEN_AWAY !== 0)
			) {
				// only allow to bother every MAX_SKIPS_TO_WAIT_WHEN_AWAY times when away
				console.info('{{user}} is away');
				return;
			}
			console.info('{{char}} is impatient');
			ChatService.addMessageAndContinue(createNewMessage('char'));
			this.runPatienceCheck(cycle + 1);
		}, timeout);
	};

	beginAutoTriggerCountdown = () => {
		if (!Config.Chat.enablePatience) {
			return;
		}
		this.runPatienceCheck(0);
	};

	listenToEvent = () => {
		const eventFileContent = FileService.getDataFile(this.EVENT_FILE);
		if (eventFileContent === null) {
			FileService.writeToDataFile(this.EVENT_FILE, '');
		}
		let prevContent = (eventFileContent || '').trim();
		FileService.watchDataFile(this.EVENT_FILE, (newContent) => {
			if (newContent !== prevContent) {
				let message = '';
				if (newContent) {
					message = Config.Chat.eventStartTemplate.replace(
						'{{event}}',
						newContent
					);
				} else {
					message = Config.Chat.eventEndTemplate.replace(
						'{{event}}',
						prevContent
					);
				}
				ChatActionsService.narrateSystemAndMaybeTrigger(
					replaceTemplates(message),
					true
				);
			}
			prevContent = newContent;
		});
	};
}

export const PatienceService = new PatienceServiceFactory();
