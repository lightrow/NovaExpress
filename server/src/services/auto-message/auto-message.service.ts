import { createNewMessage } from '../../lib/createNewMessage';
import { replaceTemplates } from '../../lib/replaceTemplates';
import { isDateBetweenTimes } from '../../util/isDateBetweenTimes';
import { ChatActionsService } from '../chat-action/chatAction.service';
import { ChatService } from '../chat/chat.service';
import { Config } from '../config/config.service';
import { FileService } from '../fs/fs.service';

export class AutoMessageService {
	static START_TIME = '8:00';
	static END_TIME = '22:00';
	static AUTO_TRIGGER_INTERVAL = 45 * 60 * 1000;
	static autoTriggerTimeout = null;

	static EVENT_FILE = 'event.txt';

	static setup = () => {
		this.listenToEvent();
		this.beginAutoTriggerCountdown();
	};

	static listenToEvent = () => {
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
				ChatActionsService.narrateAndTrigger(replaceTemplates(message));
			}
			prevContent = newContent;
		});
	};

	static beginAutoTriggerCountdown = () => {
		clearTimeout(this.autoTriggerTimeout);
		this.autoTriggerTimeout = setTimeout(() => {
			if (isDateBetweenTimes(new Date(), this.END_TIME, this.START_TIME)) {
				console.info('{{char}} is sleeping');
				this.beginAutoTriggerCountdown();
				return;
			}
			console.info('{{char}} is bored');

			// let message = '';
			// message = '*Time passed, clock now showing {{time}}.*';
			// const narratorMessage: ChatMessage = {
			// 	persona: 'narrator',
			// 	date: new Date().getTime(),
			// 	message: replaceTemplates(message),
			// };
			// ClientSocketService.onMessageReceived(narratorMessage);

			ChatService.addMessageAndContinue(createNewMessage('char'));

			this.beginAutoTriggerCountdown();
		}, this.AUTO_TRIGGER_INTERVAL);
	};
}
