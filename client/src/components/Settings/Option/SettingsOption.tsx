import { FC } from 'react';
import styles from './SettingsOption.module.css';
import { Slider } from '../../Slider/Slider';

export const SettingsOption: FC<{
	label: string;
	icon: any;
	value: any;
	min?: number;
	max?: number;
	step?: number;
	onClick?: () => void;
	onChange?: (t: string) => void;
	onSlide?: (val: number) => void;
}> = ({ icon, label, onClick, onChange, onSlide, value }) => {
	return (
		<div className={styles.container}>
			<div className={styles.labelContainer}>
				{icon}
				<span className={styles.label}>{label}</span>
			</div>
			{onClick && (
				<button className={styles.button} onClick={onClick}>
					{value}
				</button>
			)}
			{onChange && (
				<input
					className={styles.input}
					value={value}
					onChange={(e) => onChange(e.currentTarget.value)}
				/>
			)}
			{onSlide && <Slider value={value} onChange={onSlide} />}
		</div>
	);
};
