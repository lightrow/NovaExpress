import { ChatMessage } from '../../../../types';
import { createNewMessage } from '../../lib/createNewMessage';
import { ChatService } from '../chat/chat.service';

export class ChatActionsService {
	static narrateAndTrigger = (message: string) => {
		ChatService.addMessageAndReply(
			createNewMessage('narrator', '*' + message + '*')
		);
	};
}
