import { FC } from 'react';
import { FaPlus } from 'react-icons/fa';
import { ChatMessage, SocketEventEnum } from '../../../../types';
import { useServerSocket } from '../socket';
import { Route, useGlobalStore } from '../store';
import styles from './Chats.module.css';
import { ChatsEntry } from './Entry/ChatsEntry';
import { EventBus, BusEventEnum } from '../../utils/eventBus';

export const Chats: FC = () => {
	const list = useGlobalStore((s) => s.chatsList);
	const socket = useServerSocket();
	const setRoute = useGlobalStore((s) => s.setRoute);

	const handleNew = () => {
		const sub = EventBus.on<ChatMessage[]>(
			BusEventEnum.CHAT_RECEIVED,
			(event) => {
				setRoute(Route.CHAT);
				sub.unsubscribe();
			}
		);
		socket.send(
			JSON.stringify({
				type: SocketEventEnum.LOAD_CHAT,
				chatId: new Date().getTime(),
			})
		);
	};

	return (
		<div className={styles.container}>
			<button onClick={handleNew} className={styles.new}>
				<FaPlus /> New Chat
			</button>
			{list.map((c) => (
				<ChatsEntry entry={c} key={c.id} />
			))}
		</div>
	);
};
