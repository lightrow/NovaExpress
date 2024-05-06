import { ChatMessage } from '../../../types';
import { useChatData } from './useChatData';

export const usePersonaName = (
	persona: ChatMessage['persona'],
	chatId?: number
) => {
	const data = useChatData(chatId);
	const name = data.personas.find((p) => p.role === persona)?.name || '';
	return name;
};
