import { ChatMessage } from '../../../types';

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
