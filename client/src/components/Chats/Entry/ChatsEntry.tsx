import { FC } from 'react';
import { ChatListEntry, SocketEventEnum } from '../../../../../types';
import { FaTrash } from 'react-icons/fa';
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
		const sub = EventBus.on(BusEventEnum.CHAT_RECEIVED, () => {
			setRoute(Route.CHAT);
			sub.unsubscribe();
		});
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
					<Avatar
						persona={entry.lastMessage.persona}
						affinity={entry.lastMessage.affinity}
						className={styles.avatar}
					/>
					<span className={styles.date}>
						Started/Branched on:{'\n'}
						{format(entry.id, 'do MMM, hh:mma')}
					</span>
				</div>
				<TextRenderer className={styles.typer} message={entry.lastMessage} />
			</button>
			<button onClick={handleDelete} className={styles.trash}>
				<FaTrash />
			</button>
		</div>
	);
};
