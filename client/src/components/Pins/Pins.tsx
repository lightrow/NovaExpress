import { FC } from 'react';
import { useGlobalStore } from '../store';
import styles from './Pins.module.css';
import { Message } from '../Message/Message';

export const Pins: FC = () => {
	const messages = useGlobalStore((s) => s.messages);
	const pins = messages.filter((m) => m.state === 'pinned');
	return (
		<div className={styles.container}>
			{pins.map((pin, index) => (
				<Message
					key={pin.date + pin.persona}
					message={pin}
					index={index}
					isPin
				/>
			))}
		</div>
	);
};
