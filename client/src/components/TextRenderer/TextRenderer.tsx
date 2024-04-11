import Markdown from 'react-markdown';
import { FC, memo, useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../../../../types';
import { useUpdateEffect } from '../../hooks/useUpdateEffect';
import { TTSGenerateQueue } from '../../lib/generateTts';
import { playBlip } from '../../lib/playBlip';
import wait from '../../utils/wait';
import { Store } from '../RCTExposer/RCTExposer';
import styles from './TextRenderer.module.css';
import rehypeRaw from 'rehype-raw';
import classNames from 'classnames';

export const TextRenderer: FC<{
	message: ChatMessage;
	isNewMessage?: boolean;
	className?: string;
}> = memo(({ message, isNewMessage, className }) => {
	const [renderedMessage, setRenderedMessage] = useState(
		isNewMessage ? '' : message.messages[message.activeIdx]
	);
	const messageToRenderRef = useRef(message.messages[message.activeIdx]);
	const renderedMessageRef = useRef(renderedMessage);
	const isRenderingRef = useRef(false);

	const renderMessage = (message: string) => {
		requestAnimationFrame(() => {
			renderedMessageRef.current = message;
			setRenderedMessage(message);
		});
	};

	const getMatchingLength = () => {
		const rendered = renderedMessageRef.current;
		const target = messageToRenderRef.current;

		const minLength = Math.min(rendered.length, target.length);
		for (let i = 0; i < minLength; i++) {
			if (rendered[i] !== target[i]) {
				return i;
			}
		}
		return minLength;
	};

	const typeMessage = async () => {
		if (isRenderingRef.current) {
			return;
		}
		isRenderingRef.current = true;
		let nextCharIdx = renderedMessageRef.current.length;
		while (true) {
			if (!messageToRenderRef.current.startsWith(renderedMessageRef.current)) {
				nextCharIdx = getMatchingLength();
				renderedMessageRef.current = renderedMessageRef.current.slice(
					0,
					getMatchingLength()
				);
			}
			if (renderedMessageRef.current === messageToRenderRef.current) {
				isRenderingRef.current = false;
				break;
			}
			const char = messageToRenderRef.current[nextCharIdx];
			renderedMessageRef.current += char;
			renderMessage(renderedMessageRef.current);
			if (Store.soundMode === 'beep') {
				try {
					if (message.persona === 'char') {
						playBlip('high');
					} else {
						playBlip('low');
					}
				} catch (error) {}
			}
			if (message.persona !== 'char') {
				await wait(10);
			} else if (char === '.') {
				await wait(100);
			} else if (char === ',') {
				await wait(200);
			} else if (char === '!') {
				await wait(100);
			} else if (char === '?') {
				await wait(300);
			} else {
				await wait(30);
			}
			nextCharIdx++;
		}
	};

	const handleEffect = () => {
		messageToRenderRef.current = message.messages[message.activeIdx];
		typeMessage();
		const globalHotkeys = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				renderMessage(message.messages[message.activeIdx]);
				TTSGenerateQueue.clear();
			}
		};
		document.addEventListener('keydown', globalHotkeys);
		return () => {
			document.removeEventListener('keydown', globalHotkeys);
		};
	};

	useUpdateEffect(() => {
		if (!isNewMessage && !isRenderingRef.current) {
			renderMessage(message.messages[message.activeIdx]);
			return;
		}
		handleEffect();
	}, [message, isNewMessage]);

	useEffect(() => {
		if (!isNewMessage) {
			return;
		}
		handleEffect();
	}, []);

	const stopTyper = () => {
		renderMessage(message.messages[message.activeIdx]);
	};

	const prettifyMessage = (message: string) => {
		return message
			.split('\n')
			.map((line) => {
				if (line === '*') {
					line = '';
				}
				const commandRegex = /(?<!\w)@[\w\_]+\({0,1}[^\)]+\){0,1}/gi;
				let formattedLine = line
					.replace(
						commandRegex,
						`<span classname='${styles.command}'>$&</span>`
					)
					.trim();

				let hasLonelyAsterisk = false;

				// ignore asterisks used as multiplication sign
				const startAsterisks = formattedLine.match(/\*[^\s]/g)?.length ?? 0;
				const endAsterisks = formattedLine.match(/[^\s]\*/g)?.length ?? 0;
				if (startAsterisks > endAsterisks) {
					hasLonelyAsterisk = true;
				}
				let hasLonelyQuote = false;
				const quoteCount = formattedLine.match(/\"/g)?.length;
				if (quoteCount && quoteCount % 2 !== 0) {
					hasLonelyQuote = true;
				}

				return [
					formattedLine,
					hasLonelyQuote ? '"' : '',
					hasLonelyAsterisk ? '*' : '',
				]
					.join('')
					.replace(/".*?"/g, `<span classname='${styles.quote}'>$&</span>`);
			})
			.join('\n');
	};

	return (
		<div onClick={stopTyper} className={classNames(styles.typer, className)}>
			<Markdown rehypePlugins={[rehypeRaw]}>
				{prettifyMessage(renderedMessage)}
			</Markdown>
		</div>
	);
});
