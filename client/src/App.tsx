import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useLayoutEffect } from 'react';
import { SocketEventEnum, SocketServerEventEnum } from '../../types';
import styles from './App.module.css';
import { Chat } from './components/Chat/Chat';
import { Chats } from './components/Chats/Chats';
import { Dialogs } from './components/Dialogs/Dialogs';
import { Nav } from './components/Nav/Nav';
import { Pins } from './components/Pins/Pins';
import { RCTExposer } from './components/RCTExposer/RCTExposer';
import { Settings } from './components/Settings/Settings';
import { Spinner } from './components/Spinner/Spinner';
import { useServerSocket } from './components/socket';
import { Route, useGlobalStore } from './components/store';
import { BusEventEnum, EventBus } from './utils/eventBus';

function App() {
	const addMessage = useGlobalStore((s) => s.updateMessage);
	const deleteMessage = useGlobalStore((s) => s.deleteMessage);
	const loadChat = useGlobalStore((s) => s.loadChat);
	const setIsInferring = useGlobalStore((s) => s.setIsInferring);
	const updateCutoffPosition = useGlobalStore((s) => s.updateCutoffPosition);
	const updateChatsList = useGlobalStore((s) => s.updateChatsList);
	const toggleSpecial = useGlobalStore((s) => s.toggleSpecialMode);
	const toggleIsAway = useGlobalStore((s) => s.toggleIsAway);
	const toggleIsSending = useGlobalStore((s) => s.toggleIsSending);
	const chatsList = useGlobalStore((s) => s.chatsList);
	const route = useGlobalStore((s) => s.route);
	const socket = useServerSocket();
	const socketUrl = useGlobalStore((s) => s.wsUrl);

	useEffect(() => {
		socket.listen((message) => {
			const obj = JSON.parse(message);
			if (!obj) {
				return;
			}
			// switch is overrated...
			if (obj.type === SocketServerEventEnum.MESSAGE_RECEIVED) {
				addMessage(obj.message);
				setTimeout(() => {
					toggleIsSending(false);
				}, 0);
			}
			if (obj.type === SocketServerEventEnum.MESSAGE_CHUNK_RECEIVED) {
				setIsInferring(true);
				addMessage(obj.message);
			}
			if (obj.type === SocketServerEventEnum.MESSAGE_DELETED) {
				deleteMessage(obj.message);
			}
			if (obj.type === SocketServerEventEnum.MESSAGE_CHAT_RECEIVED) {
				EventBus.send({
					key: BusEventEnum.CHAT_RECEIVED,
					data: obj.chat,
				});
				loadChat(obj.chat);
			}
			if (obj.type === SocketServerEventEnum.STREAM_END) {
				setIsInferring(false);
			}
			if (obj.type === SocketServerEventEnum.CUTOFF_POSITION) {
				updateCutoffPosition(obj.position);
			}
			if (obj.type === SocketServerEventEnum.CHATS_LIST) {
				updateChatsList(obj.list);
			}
			if (obj.type === SocketEventEnum.TOGGLE_SPECIAL) {
				toggleSpecial(obj.value);
			}
			if (obj.type === SocketEventEnum.TOGGLE_AWAY) {
				toggleIsAway(obj.value);
			}
		});
		socket.connect(socketUrl);
	}, [socketUrl]);

	useLayoutEffect(() => {
		window.scrollTo({ top: 0, behavior: 'instant' });
	}, [route]);

	return (
		<main className={styles.main}>
			<RCTExposer />
			<Nav />

			{route === Route.SETTINGS ? (
				<Settings />
			) : (
				<AnimatePresence initial={false} mode='wait'>
					<motion.div
						key={chatsList.length ? 'hmm' : 'yeah'}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0, transition: { delay: 0.5 } }}
						className={styles.inner}
					>
						{chatsList.length ? (
							<>
								{route === Route.CHAT && <Chat />}
								{route === Route.CHATS && <Chats />}
								{route === Route.PINS && <Pins />}
							</>
						) : (
							<>
								<Spinner />
							</>
						)}
					</motion.div>
				</AnimatePresence>
			)}

			<Dialogs />
		</main>
	);
}

export default App;
