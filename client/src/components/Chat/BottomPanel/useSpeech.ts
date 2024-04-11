import { useEffect, useRef, useState } from 'react';
import { checkIsMobile } from '../../../utils/checkIsMobile';
import { deleteLastWord } from '../../../utils/deleteLastWord';
import { useGlobalStore } from '../../store';
import { useActions } from '../useActions';

const STOP_WORD = 'stop';
const START_WORD = 'listen';
const SEND_WORD = 'transmit';
const REROLL_WORD = 'repeat';
const CONTINUE = 'continue';
const STOP_INFERENCE_WORD = 'wait';
const DELETE_WORD = 'delete';
const PURGE_WORD = 'clear';
const NARRATE_WORD = 'narrate';
const TRIGGER_WORD = 'trigger';

export const useSpeech = () => {
	const isSSTEnabled = useGlobalStore((s) => s.isSSTEnabled);

	const {
		submit,
		submitAndContinue,
		setInput,
		retry,
		stop,
		setIsActive,
		textAreaRef,
	} = useActions();

	const recognitionRef = useRef<any>(null);

	const prevSentenceRef = useRef('');
	const sentenceRef = useRef('');
	const shouldTranscribe = useRef(false);

	const parseCommand = (transcription: string) => {
		const lastWord = transcription.split(' ').slice(-1)?.[0]?.toLowerCase();
		let matched = true;
		switch (lastWord) {
			case TRIGGER_WORD:
				if (shouldTranscribe.current) {
					return;
				}
				submitAndContinue('char');
				return;
			case NARRATE_WORD:
				if (shouldTranscribe.current) {
					return;
				}
				submitAndContinue('narrator');
				return;
			case SEND_WORD:
				setInput((s) => {
					if (!s) {
						return s;
					}
					submit();
					return s;
				});
				return;
			case STOP_INFERENCE_WORD:
				if (shouldTranscribe.current) {
					return;
				}
				stop();
				return;
			case PURGE_WORD:
				if (shouldTranscribe.current) {
					return;
				}
				setInput('');
				return;
			case DELETE_WORD:
				if (shouldTranscribe.current) {
					return;
				}
				setInput((i) => deleteLastWord(i));
				return;
			case STOP_WORD:
				setIsActive(false);
				shouldTranscribe.current = false;
				return;
			case REROLL_WORD:
				if (shouldTranscribe.current) {
					return;
				}
				retry();
				return;
			case START_WORD:
				if (shouldTranscribe.current) {
					return;
				}
				prevSentenceRef.current = '';
				discardedTransriptionIndexRef.current += transcription.length + 1;
				setIsActive(true);
				setInput('');
				setTimeout(() => {
					shouldTranscribe.current = true;
				}, 250);
				return;
			case CONTINUE:
				if (shouldTranscribe.current) {
					return;
				}
				prevSentenceRef.current = '';
				discardedTransriptionIndexRef.current += transcription.length + 1;
				setInput((s) => {
					if (!s) {
						return s;
					}
					setIsActive(true);
					setTimeout(() => {
						shouldTranscribe.current = true;
					}, 250);
					prevSentenceRef.current = s + ' ';
					return s + ' ';
				});
				return;
			default:
				matched = false;
				return matched;
		}
	};

	const discardedTransriptionIndexRef = useRef(0);

	const handleTransription = (sentence: string) => {
		if (sentenceRef.current === sentence) {
			return;
		}
		sentenceRef.current = sentence;
		const matchedCommand = parseCommand(sentence);
		if (matchedCommand || !shouldTranscribe.current) {
			return;
		}
		setInput(
			(prevSentenceRef.current + sentence)
				.replace(/ comma(?![^\ ]*\w)/gi, ',')
				.replace(/\sexclamation/gi, '!')
				.replace(/\speriod/gi, '.')
				.replace(/\squestion mark/gi, '?')
				.replace(/princess/gi, 'hime-sama')
				.replace(/big sis/gi, 'onee-san')
				.replace(/affirmative/gi, 'ryokai')
				.replace(/yes(?![^\ ]*\w)/gi, 'hai')
				.replace(/no(?![^\ ]*\w)/gi, 'iie')
				.replace(/good morning/gi, 'ohayou')
				.replace(/good evening/gi, 'konbanwa')
				.replace(/goodnight/gi, 'oyasumi')
		);
		setTimeout(() => {
			if (!textAreaRef.current) {
				return;
			}
			textAreaRef.current.selectionStart = textAreaRef.current.value.length;
			textAreaRef.current.scrollTo({ top: textAreaRef.current.scrollHeight });
		}, 0);
	};

	const setupSST = () => {
		if (recognitionRef.current) {
			return;
		}

		const recognition = new ((<any>window).SpeechRecognition ||
			(<any>window).webkitSpeechRecognition ||
			(<any>window).mozSpeechRecognition ||
			(<any>window).msSpeechRecognition)();
		recognitionRef.current = recognition;

		try {
			discardedTransriptionIndexRef.current = 0;
			recognition.lang = 'en-US';
			recognition.continuous = true;
			recognition.interimResults = true;
			recognition.maxAlternatives = 0;
			recognition.onend = () => {
				destroySST();
			};
			recognition.onerror = () => {
				destroySST();
			};
			recognition.start();
			recognition.onresult = (event) => {
				let results = Array.from(event.results);

				const finalText = results
					.map((res) => res[0].transcript.trim())
					.filter((text) => !!text.length)
					.join(' ');

				const indexOfDiscarded = Math.min(
					finalText.length,
					discardedTransriptionIndexRef.current
				);

				handleTransription(finalText.slice(indexOfDiscarded).trim());
			};
			setSstExists(true);
		} catch (error) {
			destroySST();
			console.log('no speech');
		}
	};

	const destroySST = () => {
		const recognition = recognitionRef.current;
		if (!recognition) {
			return;
		}
		recognition.onend = null;
		recognition.onresult = null;
		recognition.abort();
		recognitionRef.current = null;
		setSstExists(false);
	};

	// iOS Safari needs these hacks
	const [shouldCreateSST, setShouldCreateSST] = useState(true);
	const [sstExists, setSstExists] = useState(false);

	useEffect(() => {
		if (!isSSTEnabled) {
			return;
		}
		if (!shouldCreateSST || sstExists) {
			return;
		}
		const interval = setInterval(() => {
			setupSST();
		}, 1000);
		return () => {
			clearInterval(interval);
		};
	}, [shouldCreateSST, sstExists, isSSTEnabled]);

	useEffect(() => {
		if (!isSSTEnabled) {
			return;
		}
		if (!shouldCreateSST) {
			destroySST();
		}
	}, [shouldCreateSST, isSSTEnabled]);

	useEffect(() => {
		if (!isSSTEnabled) {
			return;
		}
		const onFocus = () => {
			if (!checkIsMobile()) {
				return;
			}
			setShouldCreateSST(true);
		};
		const onBlur = () => {
			if (!checkIsMobile()) {
				return;
			}
			setShouldCreateSST(false);
		};
		window.addEventListener('focus', onFocus);
		window.addEventListener('blur', onBlur);
		return () => {
			window.removeEventListener('focus', onFocus);
			window.removeEventListener('blur', onBlur);
			destroySST();
		};
	}, [shouldCreateSST, isSSTEnabled]);
};

export function getBase64Async(file) {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = function () {
			resolve(String(reader.result));
		};
		reader.onerror = function (error) {
			reject(error);
		};
	});
}
