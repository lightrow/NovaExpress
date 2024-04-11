import ChatConfig from '../../../server/config/chatConfig.json';
import { ChatMessage } from '../../../types';

export const getPersonaName = (persona: ChatMessage['persona']) => {
	return {
		user: ChatConfig.userName,
		char: ChatConfig.charName,
		narrator: ChatConfig.narratorName,
		system: '',
	}[persona];
};
