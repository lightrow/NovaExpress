import classNames from 'classnames';
import { FC, memo, useMemo } from 'react';
import { ChatMessage } from '../../../../types';
import { useChatData } from '../../hooks/useChatData';
import { Store } from '../RCTExposer/RCTExposer';
import styles from './Avatar.module.css';
import { useGlobalStore } from '../store';

export const Avatar: FC<{
	persona: ChatMessage['persona'];
	affinity?: ChatMessage['affinity'];
	className?: string;
	chatId?: number;
}> = memo(({ persona, affinity, className, chatId }) => {
	const { personas } = useChatData(chatId);
	const serverUrl = useGlobalStore((s) => s.serverUrl);

	const img = useMemo(() => {
		const { avatars } = personas.find((p) => p.role === persona);
		return (
			(() => {
				if (Store.isSpecialMode) {
					// intentionally not reactive, for now
					return avatars.special;
				}
				if (affinity === undefined) {
					return avatars.default;
				}
				if (affinity > 80) {
					return avatars.affinity_1;
				}
				if (affinity > 60) {
					return avatars.affinity_2;
				}
				if (affinity > 40) {
					return avatars.affinity_3;
				}
				if (affinity > 20) {
					return avatars.affinity_4;
				}
				return avatars.affinity_5;
			})() ?? avatars.default
		);
	}, [persona, affinity, chatId]);

	return (
		<div className={classNames(styles.avatarContainer, className)}>
			<img src={serverUrl + img} className={styles.avatar} />
		</div>
	);
});
