import { FC, memo, useMemo } from 'react';
import { ChatMessage } from '../../../../types';
import styles from './Avatar.module.css';
import classNames from 'classnames';

export const Avatar: FC<{
	persona: ChatMessage['persona'];
	affinity?: ChatMessage['affinity'];
	className?: string;
}> = memo(({ persona, affinity, className }) => {
	const img = useMemo(() => {
		if (persona !== 'char') {
			return persona + '.png';
		}
		if (affinity === undefined) {
			return 'char_3.png';
		}
		if (affinity > 80) {
			return 'char_1.png';
		}
		if (affinity > 60) {
			return 'char_2.png';
		}
		if (affinity > 40) {
			return 'char_3.png';
		}
		if (affinity > 20) {
			return 'char_4.png';
		}
		return 'char_5.png';
	}, [persona, affinity]);
	return (
		<div className={classNames(styles.avatarContainer, className)}>
			<img src={img} className={styles.avatar} />
		</div>
	);
});
