import classNames from 'classnames';
import { FC, memo, useId, useMemo } from 'react';
import { ChatMessage } from '../../../../types';
import { useChatData } from '../../hooks/useChatData';
import { Store } from '../RCTExposer/RCTExposer';
import styles from './Avatar.module.css';
import { useGlobalStore } from '../store';

function getHash(input) {
	var hash = 0,
		len = input.length;
	for (var i = 0; i < len; i++) {
		hash = (hash << 5) - hash + input.charCodeAt(i);
		hash |= 0; // to 32bit integer
	}
	return hash;
}

export const Avatar: FC<{
	persona: ChatMessage['persona'];
	affinity?: ChatMessage['affinity'];
	className?: string;
	chatId?: number;
}> = memo(({ persona, affinity, className, chatId }) => {
	const id = useId();
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
		<div
			className={classNames(styles.avatarContainer, className)}
			style={{ filter: `url(#noise${id})` }}
		>
			<svg
				width='200'
				height='200'
				viewBox='0 0 100 100'
				xmlns='http://www.w3.org/2000/svg'
				className={styles.back}
			>
				<filter id={`back${id}`}>
					<feTurbulence
						type='turbulence'
						baseFrequency='0.06'
						seed={getHash(id)}
						numOctaves='8'
						result='turbulence'
					/>
					<feDisplacementMap
						in2='turbulence'
						in='SourceGraphic'
						scale='15'
						xChannelSelector='R'
						yChannelSelector='G'
					/>
				</filter>
				<filter id={`noise${id}`}>
					<feTurbulence baseFrequency='1' />
					<feColorMatrix
						in='colorNoise'
						type='matrix'
						values='1 1 1 0 0 1 1 1 0 0 1 1 1 0 0 0 0 1 0 0'
					/>
					<feComposite operator='in' in2='SourceGraphic' result='monoNoise' />
					<feBlend in='SourceGraphic' in2='monoNoise' mode='multiply' />
				</filter>
			</svg>
			<img src={serverUrl + img} className={styles.avatar} />
			<img
				src={serverUrl + img}
				className={styles.back}
				style={{ filter: `url(#back${id})` }}
			/>
		</div>
	);
});
