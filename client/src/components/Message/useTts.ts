import { useRef } from 'react';
import { ChatMessage } from '../../../../types';
import { useUpdateEffect } from '../../hooks/useUpdateEffect';
import { generateTTS, queueTTSPhrase } from '../../lib/generateTts';
import { useGlobalStore } from '../store';

export const useTts = (message: ChatMessage, isNewMessage: boolean) => {
	const text = message.messages[message.activeIdx];
	const spokenMessageRef = useRef(!isNewMessage ? text : '');
	const isInferring = useGlobalStore((s) => s.isInferring);
	const soundMode = useGlobalStore((s) => s.soundMode);

	const handleTTSOnMessageUpdate = (message: ChatMessage) => {
		const text = message.messages[message.activeIdx];
		if (spokenMessageRef.current === text) {
			return;
		}
		if (text.indexOf(spokenMessageRef.current) !== 0) {
			spokenMessageRef.current = '';
		}
		const spokenPhrase = queueTTSPhrase(text, spokenMessageRef.current);
		if (spokenPhrase) {
			spokenMessageRef.current += spokenPhrase;
		}
		if (!spokenPhrase && !isInferring) {
			generateTTS(text.replace(spokenMessageRef.current, ''));
			spokenMessageRef.current = text;
		}
	};

	useUpdateEffect(() => {
		if (soundMode !== 'tts') {
			return;
		}
		if (message.persona !== 'char') {
			return;
		}
		handleTTSOnMessageUpdate(message);
	}, [message, isNewMessage, isInferring, soundMode]);
};
