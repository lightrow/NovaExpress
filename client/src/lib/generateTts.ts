import PQueue from 'p-queue';
import { Store } from '../components/RCTExposer/RCTExposer';
import { getBase64Async } from '../components/Chat/BottomPanel/useSpeech';

const parseString = (str: string) => {
	return str
		.replace(/~/g, '.')
		.replace(/([^\w\s\,\.\'\!\?\-])*/g, '')
		.replace(/-kun/gi, ' coon')
		.replace(/ohayo/gi, "o'huh'yoh")
		.replace(/(\W?)+n[e+](\W)+/gi, "$1ne'h$2")
		.replace(/(\W?)+un(\W)+/gi, '$1Oon$2')
		.replace(/hmph/gi, 'umf');
};

export const TTSAudioElement = new Audio();
TTSAudioElement.src = '/silence.mp3';
TTSAudioElement.autoplay = true;
TTSAudioElement.id = 'tts_audio';
TTSAudioElement.muted = true;
document.body.appendChild(TTSAudioElement);

export const TTSGenerateQueue = new PQueue({ autoStart: true, concurrency: 1 });
export const TTSPlaybackQueue = new PQueue({ autoStart: true, concurrency: 1 });

const phraseRegex =
	/^\s*[\.\.\.]*[\w\'\’\-\s]+[\~\?\!\.\,\*][\s\?\!\~\.\,\*]*(\s{0,1}\w{1})/g;

export const parsePhraseFromText = (
	stream: string,
	alreadySpokenText: string
) => {
	const newText = stream.replace(alreadySpokenText, '');
	const match = newText.match(phraseRegex);
	const phrase = match?.[0];
	if (phrase) {
		return phrase.slice(0, -1);
	}
};

export const queueTTSText = (text: string) => {
	let prev = '';
	while (prev !== text) {
		const phrase1 = parsePhraseFromText(text, prev);
		const phrase2 = parsePhraseFromText(text, prev + phrase1);
		if (!(phrase1 && phrase2)) {
			generateTTS(text.replace(prev, ''));
			prev = text;
		} else {
			generateTTS(phrase1 + phrase2);
			prev += phrase1 + phrase2;
		}
	}
};

export const queueTTSPhrase = (text: string, prevText: string) => {
	const phrase = parsePhraseFromText(text, prevText);
	if (phrase) {
		generateTTS(phrase);
	}
	return phrase;
};

export const generateTTS = (str: string) => {
	TTSGenerateQueue.add(async () => {
		return new Promise<void>(async (resolve) => {
			const response = await fetch(Store.ttsUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Cache-Control': 'no-cache',
				},
				body: new URLSearchParams({
					text: parseString(str),
					voice: 'mona',
				}),
			});

			const blob = await response.blob();
			const srcUrl = await getBase64Async(blob);
			TTSPlaybackQueue.add(async () => {
				return new Promise<void>((resolve) => {
					TTSAudioElement.src = '/silence.mp3';
					TTSAudioElement.play();
					TTSAudioElement.volume = Store.ttsVolume / 100;
					TTSAudioElement.src = srcUrl;
					TTSAudioElement.oncanplay = () => {
						TTSAudioElement.muted = false;
						TTSAudioElement.play();
					};
					TTSAudioElement.onended = () => resolve();
					TTSAudioElement.onerror = () => resolve();
				});
			});
			resolve();
		});
	});
};
