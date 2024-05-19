import { ChatMessage } from '../../../types';
import { Config } from '../services/config/config.service';
import { getThinkMessageStart } from './getRandomThinkStart';

export const createNewMessage = (
	persona: ChatMessage['persona'],
	message = '',
	date = new Date().getTime() + Math.random(),
	direction?: string
) => {
	if (persona === 'char' && !message) {
		message = getThinkMessageStart();
	}
	return {
		activeIdx: 0,
		date: date,
		messages: [message],
		persona,
		direction,
	} as ChatMessage;
};

export const createDirectionMessage = (
	message: string,
	date = new Date().getTime(),
	direction?: string
) => {
	return createNewMessage(
		'system',
		Config.Chat.directionTemplate.replace('{{direction}}', message),
		date,
		direction
	);
};
