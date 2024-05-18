import { createNewMessage } from '../../lib/createNewMessage';
import { yesOrNo } from '../../util/maybe';
import { ChatService } from '../chat/chat.service';

export class ChatActionsService {
	static narrateSystemAndMaybeTrigger = (
		message: string,
		asNarrator?: boolean
	) => {
		const shouldTrigger = yesOrNo();
		if (shouldTrigger) {
			ChatService.addMessageAndReply(
				createNewMessage(asNarrator ? 'narrator' : 'system', message)
			);
		} else {
			ChatService.addMessage(
				createNewMessage(asNarrator ? 'narrator' : 'system', message)
			);
		}
	};
}
