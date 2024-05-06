import { useMemo } from 'react';
import { useGlobalStore } from '../components/store';

export const useChatData = (chatId?: number) => {
	const chatsList = useGlobalStore((s) => s.chatsList);

	return useMemo(() => {
		return chatsList.find((chat) => {
			if (chatId) {
				return chat.id === chatId;
			} else {
				return chat.active;
			}
		});
	}, [chatsList, chatId]);
};
