import { FC } from 'react';
import { FaPlus } from 'react-icons/fa';
import { SocketEventEnum } from '../../../../types';
import { useServerSocket } from '../socket';
import { Route, useGlobalStore } from '../store';
import styles from './Chats.module.css';
import { ChatsEntry } from './Entry/ChatsEntry';

export const Chats: FC = () => {
	const list = useGlobalStore((s) => s.chatsList);
	const socket = useServerSocket();
	const setRoute = useGlobalStore((s) => s.setRoute);

	const handleNew = () => {
		socket.send(
			JSON.stringify({
				type: SocketEventEnum.LOAD_CHAT,
				chatId: new Date().getTime(),
			})
		);
		setRoute(Route.CHAT);
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
