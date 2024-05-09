import classNames from 'classnames';
import { FC, useEffect, useState } from 'react';
import { useGlobalStore } from '../../store';
import { useActions } from '../useActions';
import { BottomPanelActive } from './Active/BottomPanelActive';
import styles from './BottomPanel.module.css';
import { BottomPanelInactive } from './Inactive/BottomPanelInactive';
import { useSpeech } from './useSpeech';
import { checkIsMobile } from '../../../utils/checkIsMobile';

export const BottomPanel: FC = () => {
	const isInferring = useGlobalStore((s) => s.isInferring);
	const { isActive, setIsActive, stop, retry, continueFromLast, cyclePersona } =
		useActions();

	useSpeech();

	useEffect(() => {
		const deactivate = () => {
			setIsActive(false);
		};
		const activate = () => {
			setIsActive(true);
		};
		const globalHotkeys = (event: KeyboardEvent) => {
			if (event.key === 'Enter') {
				if (isInferring) {
					return;
				}
				if (event.ctrlKey) {
					retry();
				} else {
					continueFromLast();
				}
			}
			if (event.key === ' ') {
				event.preventDefault();
				if (!isActive) {
					activate();
				}
				if (event.ctrlKey) {
					cyclePersona();
				}
			}
			if (event.key === 'Escape') {
				if (isActive) {
					deactivate();
				} else {
					stop();
				}
			}
		};
		if (isActive) {
			document.addEventListener('click', deactivate);
		}
		document.addEventListener('keydown', globalHotkeys);
		return () => {
			document.removeEventListener('click', deactivate);
			document.removeEventListener('keydown', globalHotkeys);
		};
	}, [isInferring, isActive]);

	return (
		<>
			<div
				className={classNames(styles.container, {
					[styles.static]: isActive && checkIsMobile(),
				})}
				onClick={(e) => e.stopPropagation()}
			>
				<div className={styles.card}>
					{isActive && <BottomPanelActive />}
					{!isActive && <BottomPanelInactive />}
				</div>
			</div>
		</>
	);
};
