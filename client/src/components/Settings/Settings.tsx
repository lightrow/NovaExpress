import { FC } from 'react';
import {
	FaItunesNote,
	FaKeyboard,
	FaMicrophone,
	FaServer,
	FaVolumeUp,
} from 'react-icons/fa';
import { FaEarListen } from 'react-icons/fa6';
import { useGlobalStore } from '../store';
import { SettingsOption } from './Option/SettingsOption';
import styles from './Settings.module.css';

export const Settings: FC = () => {
	const soundMode = useGlobalStore((s) => s.soundMode);
	const toggleSoundMode = useGlobalStore((s) => s.toggleSoundMode);
	const wsUrl = useGlobalStore((s) => s.wsUrl);
	const updateWSUrl = useGlobalStore((s) => s.updateWSUrl);
	const ttsUrl = useGlobalStore((s) => s.ttsUrl);
	const updateTTSUrl = useGlobalStore((s) => s.updateTTSUrl);
	const ttsVolume = useGlobalStore((s) => s.ttsVolume);
	const updateTTSVolume = useGlobalStore((s) => s.updateTTSVolume);
	const beepVolume = useGlobalStore((s) => s.beepVolume);
	const updateBeepVolume = useGlobalStore((s) => s.updateBeepVolume);
	const isSSTEnabled = useGlobalStore((s) => s.isSSTEnabled);
	const toggleSST = useGlobalStore((s) => s.toggleSST);

	return (
		<div className={styles.container}>
			<div className={styles.group}>
				<SettingsOption
					icon={<FaServer />}
					label='Server URL'
					onChange={updateWSUrl}
					value={wsUrl}
				/>
				<SettingsOption
					icon={<FaItunesNote />}
					label='Auto Sound'
					onClick={toggleSoundMode}
					value={soundMode}
				/>
				<SettingsOption
					icon={<FaMicrophone />}
					label='TTS URL'
					onChange={updateTTSUrl}
					value={ttsUrl}
				/>
				<SettingsOption
					icon={<FaEarListen />}
					label='Speech To Text'
					onClick={toggleSST}
					value={isSSTEnabled ? 'Enabled' : 'Disabled'}
				/>
				<SettingsOption
					icon={<FaVolumeUp />}
					label='TTS Volume'
					value={ttsVolume}
					onSlide={updateTTSVolume}
					min={0}
					max={100}
					step={1}
				/>
				{soundMode === 'beep' && (
					<SettingsOption
						icon={<FaKeyboard />}
						label='Beep Volume'
						value={beepVolume}
						onSlide={updateBeepVolume}
						min={0}
						max={100}
						step={1}
					/>
				)}
				<div className={styles.row}>
					<p>
						Speech To Text is only active on the Chat window, and it always
						listens (aka stream mode). Actions will only be performed on certain
						keywords.
					</p>
					<ul className={styles.list}>
						<li>LISTEN: Expands the textarea and begins transcription.</li>
						<li>
							STOP: Stops transcription and closes the textarea. This is the
							only keyword that works while transcription is active.
						</li>
						<li>TRANSMIT: Sends the typed message</li>
						<li>DELETE: Deletes last word</li>
						<li>CLEAR: Deletes whole transcription</li>
						<li>
							CONTINUE: Same as LISTEN but doesn't erase already typed text
						</li>
						<li>WAIT: Stops ongoing inference</li>
						<li>REPEAT: Regenerates last message in chat</li>
					</ul>
				</div>
			</div>
		</div>
	);
};
