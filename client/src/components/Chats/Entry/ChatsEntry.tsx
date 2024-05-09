import { FC } from 'react';
import {
	ChatListEntry,
	ChatMessage,
	SocketEventEnum,
} from '../../../../../types';
import { FaCalendar, FaTrash } from 'react-icons/fa';
import { format } from 'date-fns';
import { TextRenderer } from '../../TextRenderer/TextRenderer';
import styles from './ChatsEntry.module.css';
import { Avatar } from '../../Avatar/Avatar';
import { useServerSocket } from '../../socket';
import { Route, useGlobalStore } from '../../store';
import { BusEventEnum, EventBus } from '../../../utils/eventBus';

export const ChatsEntry: FC<{ entry: ChatListEntry }> = ({ entry }) => {
	const socket = useServerSocket();
	const setRoute = useGlobalStore((s) => s.setRoute);

	const handleDelete = () => {
		socket.send(
			JSON.stringify({
				type: SocketEventEnum.DELETE_CHAT,
				chatId: entry.id,
			})
		);
	};

	const handleLoad = () => {
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
				chatId: entry.id,
			})
		);
	};

	return (
		<div className={styles.container}>
			<button onClick={handleLoad} className={styles.left}>
				<div className={styles.top}>
					{entry.personas
						.filter((p) => p.role !== 'system')
						.map((p) => (
							<Avatar
								persona={p.role}
								className={styles.avatar}
								chatId={entry.id}
							/>
						))}
				</div>
				<span className={styles.date}>
					<FaCalendar /> {format(entry.lastMessage.date, 'do MMM, hh:mma')}
				</span>
				<TextRenderer className={styles.typer} message={entry.lastMessage} />
			</button>
			<button onClick={handleDelete} className={styles.trash}>
				<FaTrash />
			</button>
		</div>
	);
};
