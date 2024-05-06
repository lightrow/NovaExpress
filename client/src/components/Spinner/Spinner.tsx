import { FC, memo } from 'react';
import styles from './Spinner.module.css';

export const Spinner: FC = memo(() => {
	return <span className={styles.spinner} />;
});
