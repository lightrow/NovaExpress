import { FC } from 'react';
import { FaChevronRight, FaSync } from 'react-icons/fa';
import { FaArrowRight, FaSpinner, FaStop } from 'react-icons/fa6';
import { useGlobalStore } from '../../../store';
import { useActions } from '../../useActions';
import styles from './BottomPanelInactive.module.css';
import { Avatar } from '../../../Avatar/Avatar';

export const BottomPanelInactive: FC = () => {
	const isInferring = useGlobalStore((s) => s.isInferring);

	const {
		stop,
		retry,
		setIsActive,
		inputValue,
		submitAndContinue,
		continueFromLast,
	} = useActions();

	const handleClick = () => {
		setIsActive(true);
	};

	const quickSubmitNarrator = () => {
		submitAndContinue('narrator');
	};

	const quickSubmitChar = () => {
		submitAndContinue('char');
	};

	return (
		<div className={styles.container} onClick={handleClick}>
			<FaChevronRight />
			<span className={styles.input}>
				{inputValue || '...'}
				&lrm;
			</span>
			<div onClick={(e) => e.stopPropagation()} className={styles.buttons}>
				{isInferring ? (
					<button className={styles.button} onClick={stop}>
						<FaStop />
					</button>
				) : (
					<>
						<button className={styles.button} onClick={quickSubmitNarrator}>
							<Avatar plain persona='narrator' />
						</button>
						<button className={styles.button} onClick={quickSubmitChar}>
							<Avatar plain persona='char' />
						</button>
						<button className={styles.button} onClick={retry}>
							<FaSync />
						</button>
						<button className={styles.button} onClick={continueFromLast}>
							<FaArrowRight />
						</button>
					</>
				)}
			</div>
		</div>
	);
};
