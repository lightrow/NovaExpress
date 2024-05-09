import { ChatMessage } from '../../../types';
import { Config } from '../services/config/config.service';

export const createNewMessage = (
	persona: ChatMessage['persona'],
	message = '',
	date = new Date().getTime() + Math.random()
) => {
	return {
		activeIdx: 0,
		date: date,
		messages: [message],
		persona,
	} as ChatMessage;
};

export const createDirectionMessage = (
	message: string,
	date = new Date().getTime()
) => {
	return createNewMessage(
		'system',
		Config.Chat.directionTemplate
			? Config.Chat.directionTemplate.replace('{{direction}}', message)
			: message,
		date
	);
};
