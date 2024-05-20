import { FC } from 'react';
import styles from './Cycler.module.css';
import classNames from 'classnames';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useServerSocket } from '../../socket';
import { ChatMessage, SocketEventEnum } from '../../../../../types';

export const Cycler: FC<{ message: ChatMessage; onCycle?: () => void }> = ({
	message,
	onCycle,
}) => {
	const socket = useServerSocket();

	const chooseNext = () => {
		socket.send(
			JSON.stringify({
				type: SocketEventEnum.EDIT_MESSAGE,
				message: {
					...message,
					activeIdx: message.activeIdx + 1,
				} as ChatMessage,
			})
		);
	};

	const choosePrev = () => {
		socket.send(
			JSON.stringify({
				type: SocketEventEnum.EDIT_MESSAGE,
				message: {
					...message,
					activeIdx: message.activeIdx - 1,
				} as ChatMessage,
			})
		);
	};

	return (
		<div className={styles.variantsPanel}>
			<button
				onClick={choosePrev}
				className={classNames(styles.buttonVariant, {
					[styles.variantDisabled]: message.activeIdx === 0,
				})}
			>
				<FaChevronLeft />
			</button>
			<div className={styles.buttonVariantSeparator} />
			<button
				onClick={chooseNext}
				className={classNames(styles.buttonVariant, {
					[styles.variantDisabled]:
						message.activeIdx >= message.messages.length - 1,
				})}
			>
				<FaChevronRight />
			</button>
		</div>
	);
};
