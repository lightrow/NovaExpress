import { throttle } from 'lodash';
import { Store } from '../components/RCTExposer/RCTExposer';

// Define a context for the Web Audio API
let audioContext = new (window.AudioContext ||
	(window as any).webkitAudioContext)();

const presets = {
	low: {
		generatedMinFrequency: 300,
		generatedMaxFrequency: 600,
	},
	med: {
		generatedMinFrequency: 600,
		generatedMaxFrequency: 1200,
	},
	high: {
		generatedMinFrequency: 1200,
		generatedMaxFrequency: 1600,
	},
};

export const playBlip = throttle(
	(preset: 'low' | 'med' | 'high') => {
		const volume = Store.beepVolume / 100;
		const { generatedMaxFrequency, generatedMinFrequency } = presets[preset];
		const frequency =
			Math.random() * (generatedMaxFrequency - generatedMinFrequency) +
			generatedMinFrequency;
		_playBlip(frequency, volume);
	},
	80,
	{
		leading: false,
	}
);

// Function to play a sound with a certain frequency
function _playBlip(frequency, volume) {
	// Create an oscillator node
	let oscillator = audioContext.createOscillator();

	// Set the oscillator wave type
	oscillator.type = 'sine';

	// Set the frequency of the wave
	oscillator.frequency.value = frequency;

	// Create a gain node to control the volume
	let gainNode = audioContext.createGain();

	// Connect the oscillator to the gain node
	oscillator.connect(gainNode);

	// Connect the gain node to the audio output
	gainNode.connect(audioContext.destination);

	// Set the gain to 0
	gainNode.gain.value = 0;

	// Start the oscillator now
	oscillator.start(audioContext.currentTime);

	// Create an "attack" stage (volume ramp up)
	gainNode.gain.linearRampToValueAtTime(
		volume,
		audioContext.currentTime + 0.01
	);

	// Create a "decay" stage (volume ramp down)
	gainNode.gain.exponentialRampToValueAtTime(
		0.00001,
		audioContext.currentTime + 0.1
	);

	// Stop the oscillator after 100 milliseconds
	oscillator.stop(audioContext.currentTime + 0.1);
}
