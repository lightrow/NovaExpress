import { FC, memo, useEffect, useRef, useState } from 'react';
import { checkIsElementInViewport } from '../../utils/checkIsElementInViewport';
import { Message } from '../Message/Message';
import { useGlobalStore } from '../store';
import { BottomPanel } from './BottomPanel/BottomPanel';
import styles from './Chat.module.css';
import { ListScrollbar } from './Scrollbar/Scrollbar';
import { ActionsProvider } from './useActions';
import useUpdatedRef from '../../hooks/useUpdatedRef';
import { HeightStabilizer } from '../HeightStabilizer/HeightStabilizer';

export const Chat: FC = memo(() => {
	const messages = useGlobalStore((s) => s.messages);
	const listRef = useRef<HTMLDivElement>(null);

	const [visibleItems, setVisibleItems] = useState([]);

	const scrollToLastMessage = (instant?: boolean) => {
		Array.from(listRef.current.children)
			.slice(-1)[0]
			.scrollIntoView({
				behavior: instant ? 'instant' : 'smooth',
				block: 'end',
			});
	};

	useEffect(() => {
		scrollToLastMessage(true);
	}, []);

	useEffect(() => {
		if (messages.length > messagesLengthRef.current) {
			scrollToLastMessage();
		}
		const handleScroll = () => {
			const list = listRef.current;
			if (!list) {
				return;
			}
			let visibleOnes = [];
			for (let i = messages.length - 1; i >= 0; i--) {
				const item = list.children[i];
				if (!item) {
					continue;
				}
				if (checkIsElementInViewport(item, true)) {
					visibleOnes.push(i);
				}
			}
			setVisibleItems(visibleOnes);
		};
		window.addEventListener('scroll', handleScroll);
		return () => {
			window.removeEventListener('scroll', handleScroll);
		};
	}, [messages.length]);

	const messagesLengthRef = useUpdatedRef(messages.length);

	return (
		<HeightStabilizer>
			<div className={styles.chat}>
				<ListScrollbar
					dates={messages.map((m) => m.date)}
					listRef={listRef}
					visibleItems={visibleItems}
					itemsLength={messages.length}
				/>
				<div className={styles.list} ref={listRef}>
					{messages.map((message, index) => (
						<Message
							key={message.date + message.persona}
							index={index}
							message={message}
							isLast={index === messages.length - 1}
						/>
					))}
				</div>
				<ActionsProvider>
					<BottomPanel />
				</ActionsProvider>
			</div>
		</HeightStabilizer>
	);
});
