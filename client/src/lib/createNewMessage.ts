import { ChatMessage } from '../../../types';

export const createNewMessage = (
	persona: ChatMessage['persona'],
	message = '',
	date = new Date().getTime()
) => {
	return {
		activeIdx: 0,
		date: new Date().getTime() + Math.random(),
		messages: [message],
		persona,
	} as ChatMessage;
};
