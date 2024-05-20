import classNames from 'classnames';
import { format } from 'date-fns/format';
import { FC, memo, useEffect, useMemo, useRef, useState } from 'react';
import {
	FaCheck,
	FaCheckCircle,
	FaChevronLeft,
	FaChevronRight,
	FaCircleNotch,
	FaCodeBranch,
	FaPen,
	FaTimesCircle,
	FaTrash,
	FaUndo,
} from 'react-icons/fa';
import { FaVolumeHigh } from 'react-icons/fa6';
import { LuCircuitBoard, LuGanttChartSquare } from 'react-icons/lu';
import { ChatMessage, SocketEventEnum } from '../../../../types';
import { usePersonaName } from '../../hooks/usePersonaName';
import { useUpdateEffect } from '../../hooks/useUpdateEffect';
import { queueTTSText } from '../../lib/generateTts';
import { splitMessageFromInsights } from '../../lib/splitMessageFromInsights';
import { checkIsMobile } from '../../utils/checkIsMobile';
import { BusEventEnum, EventBus } from '../../utils/eventBus';
import { getScrollBottom } from '../../utils/getScrollBottom';
import { Avatar } from '../Avatar/Avatar';
import { TextInput } from '../TextInput/TextInput';
import { TextRenderer } from '../TextRenderer/TextRenderer';
import { useServerSocket } from '../socket';
import { useGlobalStore } from '../store';
import { DotsAnimation } from './DotsAnimation/DotsAnimation';
import styles from './Message.module.css';
import { useTts } from './useTts';
import { Cycler } from './Cycler/Cycler';

export const Message: FC<{
	index: number;
	message: ChatMessage;
	isLast?: boolean;
	isPin?: boolean;
}> = memo(({ index, message, isLast, isPin }) => {
	const ref = useRef<HTMLDivElement>(null);
	const socket = useServerSocket();
	const [isEditing, setIsEditing] = useState(false);
	const [isEdited, setIsEdited] = useState(false);
	const [lastMessagePadding, setLastMessagePadding] = useState(96);
	const isInferring = useGlobalStore((s) => s.isInferring);
	const isSending = useGlobalStore((s) => s.isSending);
	const alwaysShowInsights = useGlobalStore((s) => s.alwaysShowInsights);
	const editInput = useRef<HTMLTextAreaElement>(null);
	const cutoffPosition = useGlobalStore((s) => s.cutoffPosition);
	const name = usePersonaName(message.persona);
	const [showInsights, setShowInsights] = useState(false);

	const isNewMessage = isInferring && isLast && !isEdited && !isSending;

	const { text, thought, note } = useMemo(
		() => splitMessageFromInsights(message.messages[message.activeIdx]),
		[message.messages[message.activeIdx]]
	);

	const beginEdit = () => {
		setIsEditing(true);
		setTimeout(() => {
			ref.current.scrollIntoView({
				block: 'center',
				behavior: 'smooth',
			});
		}, 0);
	};

	const togglePinMessage = () => {
		const states = ['none', 'pinned', 'pruned'];
		const nextState = !message.state
			? 'pinned'
			: states[
					(states.findIndex((s) => s === message.state) + 1) % states.length
			  ];
		socket.send(
			JSON.stringify({
				type: SocketEventEnum.EDIT_MESSAGE,
				message: { ...message, state: nextState },
			})
		);
	};

	const confirmEdit = () => {
		const text = editInput.current!.value;
		setIsEditing(false);
		setIsEdited(true);
		if (text === message.messages[message.activeIdx]) {
			return;
		}
		const newMessages = [...message.messages];
		newMessages[message.activeIdx] = text;
		const newM: ChatMessage = { ...message, messages: newMessages };
		socket.send(
			JSON.stringify({
				type: SocketEventEnum.EDIT_MESSAGE,
				message: newM,
			})
		);
	};

	const cancelEdit = () => {
		setIsEditing(false);
		setIsEdited(true);
	};

	const confirmDelete = () => {
		socket.send(
			JSON.stringify({
				type: SocketEventEnum.DELETE_MESSAGE,
				message: message,
			})
		);
	};

	const branch = () => {
		socket.send(
			JSON.stringify({
				type: SocketEventEnum.BRANCH_AT_MESSAGE,
				message: message,
			})
		);
	};

	const speak = () => {
		queueTTSText(message.messages[message.activeIdx]);
	};

	const onCycle = () => {
		setIsEdited(true);
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		e.stopPropagation();
		if (e.key === 'Enter') {
			if (!e.shiftKey && !checkIsMobile()) {
				e.preventDefault();
				confirmEdit();
			}
		}
	};

	const toggleShowInsights = () => {
		setShowInsights((s) => !s);
	};

	useTts(message, isNewMessage);

	useEffect(() => {
		if (!isLast) {
			return;
		}
		EventBus.on<number>(BusEventEnum.BOTTOM_PANEL_HEIGHT, (event) => {
			setLastMessagePadding(event.data);
		});
		if (isEdited) {
			return;
		}

		const observer = new ResizeObserver(([el]) => {
			if (getScrollBottom() < 100) {
				el.target.scrollIntoView({ behavior: 'smooth', block: 'end' });
			}
		});
		observer.observe(ref.current!);
		return () => {
			observer.disconnect();
		};
	}, [isLast, isEdited]);

	useUpdateEffect(() => {
		setIsEdited(false);
	}, [message]);

	const showThought =
		(showInsights ||
			alwaysShowInsights ||
			(!text && !(isInferring && isLast))) &&
		thought;

	return (
		<div
			ref={ref}
			className={classNames(styles.message, styles[message.persona], {
				[styles.cutoffBorder]: cutoffPosition === index && index > 0,
				[styles.isLast]: isLast,
				[styles.pruned]:
					(cutoffPosition > index && message.state !== 'pinned') ||
					message.state === 'pruned',
			})}
			style={{
				paddingBottom: isLast ? (checkIsMobile() ? 96 : lastMessagePadding) : 0,
				marginBottom: isLast && checkIsMobile() ? -96 : 0,
			}}
		>
			<div className={styles.message__left}>
				<Avatar persona={message.persona} affinity={message.affinity} />
				{message.messages.length > 1 && (
					<Cycler message={message} onCycle={onCycle} />
				)}
				<span className={styles.message__index}>#{index}</span>
			</div>
			<div className={styles.message__right}>
				{isEditing ? (
					<div className={styles.message__editContainer}>
						<TextInput
							onKeyDown={handleKeyDown}
							defaultValue={message.messages[message.activeIdx]}
							ref={editInput}
						/>
						<div className={styles.message__edit__actions}>
							<button onClick={confirmEdit}>
								Confirm <FaCheck />
							</button>
							<button onClick={cancelEdit}>
								Cancel <FaUndo />
							</button>
						</div>
					</div>
				) : (
					<>
						<div className={styles.message__top}>
							<span
								className={styles.message__author}
								onClick={toggleShowInsights}
							>
								{thought && <LuCircuitBoard />}
								{note && <LuGanttChartSquare />}
								{name}
							</span>
							{index !== 0 && (
								<span className={styles.message__date}>
									{format(message.date, 'do MMM, hh:mma')}
								</span>
							)}

							<div className={styles.message__actions}>
								<FaVolumeHigh onClick={speak} />
								<FaTrash onClick={confirmDelete} />
								<FaPen onClick={beginEdit} />
								{!isPin && <FaCodeBranch onClick={branch} />}
								{(!message.state || message.state === 'none') && (
									<FaCircleNotch onClick={togglePinMessage} />
								)}
								{message.state === 'pinned' && (
									<FaCheckCircle
										onClick={togglePinMessage}
										color='var(--color-highlight)'
									/>
								)}
								{message.state === 'pruned' && (
									<FaTimesCircle onClick={togglePinMessage} color='red' />
								)}
							</div>
						</div>
						<div className={styles.message__text}>
							{showThought && (
								<TextRenderer
									className={classNames(styles.insight, styles.thought)}
									message={thought}
									isNewMessage={isNewMessage}
									persona={message.persona}
								/>
							)}
							{note && (
								<TextRenderer
									className={classNames(styles.insight, styles.note)}
									message={'Note: ' + note}
									isNewMessage={isNewMessage}
									persona={message.persona}
								/>
							)}
							{!text ? (
								thought && isInferring && isLast ? (
									<TextRenderer
										message={'*Thinking...*'}
										isNewMessage={isNewMessage}
										persona={message.persona}
									/>
								) : (
									isInferring && isLast && <DotsAnimation />
								)
							) : (
								<TextRenderer
									message={text}
									isNewMessage={isNewMessage}
									persona={message.persona}
								/>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
});
