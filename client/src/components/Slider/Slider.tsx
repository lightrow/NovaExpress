import { FC } from 'react';
import styles from './Slider.module.css';

export const Slider: FC<{
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
}> = ({ onChange, value, min = 0, max = 100, step = 1 }) => {
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onChange(parseInt(e.currentTarget.value));
	};

	return (
		<label className={styles.slider}>
			<span className={styles.value}>{value}</span>
			<input
				className={styles.input}
				type='range'
				min={min}
				max={max}
				value={value}
				onChange={handleChange}
				step={step}
			/>
		</label>
	);
};
