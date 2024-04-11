import { FC } from 'react';
import { DialogData } from '../Dialogs';
import styles from './Dialog.module.css';
import classNames from 'classnames';

export const Dialog: FC<{ data: DialogData; onClose: () => void }> = ({
	data,
	onClose,
}) => {
	const handleClick = (action: DialogData['actions'][0]) => () => {
		action.fn?.();
		onClose();
	};

	return (
		<div className={styles.backdrop} onClick={onClose}>
			<div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
				<p className={styles.label}>{data.text}</p>
				<div className={styles.actions}>
					{data.actions.map((action) => (
						<button
							className={classNames(styles.action, {
								[styles.secondary]: !action.fn,
							})}
							onClick={handleClick(action)}
						>
							{action.label}
						</button>
					))}
				</div>
			</div>
		</div>
	);
};
