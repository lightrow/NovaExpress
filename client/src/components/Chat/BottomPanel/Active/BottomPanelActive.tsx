import { FC, useEffect, useRef } from 'react';
import { FaChevronRight, FaCircle } from 'react-icons/fa';
import { FaCircleDot } from 'react-icons/fa6';
import { ChatMessage } from '../../../../../../types';
import { checkIsMobile } from '../../../../utils/checkIsMobile';
import { BusEventEnum, EventBus } from '../../../../utils/eventBus';
import { getPersonaName } from '../../../../utils/getPersonaName';
import { getScrollBottom } from '../../../../utils/getScrollBottom';
import { Avatar } from '../../../Avatar/Avatar';
import { TextInput } from '../../../TextInput/TextInput';
import { useGlobalStore } from '../../../store';
import { useActions } from '../../useActions';
import styles from './BottomPanelActive.module.css';

export const BottomPanelActive: FC = () => {
	const isSpecial = useGlobalStore((s) => s.isSpecialMode);

	const handleSubmit = () => {
		submit();
	};

	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		// Safari Browser is messed up, Safari PWA works ok.
		const container = containerRef.current;
		if (!container) {
			return;
		}
		let height = 0;
		const observer = new ResizeObserver(([el]) => {
			height = el.target.clientHeight + 3 * 16;
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = null;
			}
			EventBus.send({ key: BusEventEnum.BOTTOM_PANEL_HEIGHT, data: height });
			if (getScrollBottom() <= height) {
				setTimeout(() => {
					window.scrollTo({
						top: document.documentElement.scrollHeight,
						behavior: checkIsMobile() ? 'instant' : 'smooth',
					});
				}, 0);
			}
		});
		observer.observe(container);
		return () => {
			if (getScrollBottom() <= height) {
				window.scrollTo({
					top:
						document.documentElement.scrollHeight -
						window.innerHeight -
						(height - 96),
					behavior: checkIsMobile() ? 'instant' : 'smooth',
				});
				timeoutRef.current = setTimeout(
					() => {
						EventBus.send({ key: BusEventEnum.BOTTOM_PANEL_HEIGHT, data: 96 });
					},
					checkIsMobile() ? 0 : 250
				); // timeout depends on scroll animation duration
			} else {
				EventBus.send({ key: BusEventEnum.BOTTOM_PANEL_HEIGHT, data: 96 });
			}
			observer.disconnect();
		};
	}, []);

	const timeoutRef = useRef(null);

	const {
		inputValue,
		setInput,
		persona,
		setPersona,
		submit,
		textAreaRef,
		shallContinue,
		shallReply,
		setShallContinue,
		setShallReply,
		toggleSpecial,
	} = useActions();

	const handleChange = (e: any) => {
		setInput(e.currentTarget.value);
	};

	const handleTextAreaKeydown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			return;
		}
		e.stopPropagation();
		if (!checkIsMobile() && e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
			e.preventDefault();
			submit();
		}
	};

	const cyclePersona = (e) => {
		e.preventDefault();
		setPersona((persona) => {
			const personas = ['user', 'char', 'narrator']; // no system allowed
			const nextPersona =
				personas[(personas.indexOf(persona) + 1) % personas.length];
			switch (nextPersona) {
				case 'user':
					setShallReply(true);
					setShallContinue(false);
					break;
				case 'char':
					setShallReply(false);
					setShallContinue(true);
				case 'narrator':
					setShallReply(false);
					setShallContinue(true);
			}

			if (nextPersona) return nextPersona as ChatMessage['persona'];
		});
	};

	const toggleContinue = (e) => {
		e.preventDefault();
		setShallContinue((s) => {
			if (!s) {
				setShallReply(false);
			}
			return !s;
		});
	};

	const toggleReply = (e) => {
		e.preventDefault();
		setShallReply((s) => {
			if (!s) {
				setShallContinue(false);
			}
			return !s;
		});
	};

	return (
		<div onClick={(e) => e.stopPropagation()} ref={containerRef}>
			<div className={styles.topPanel}>
				<button onClick={cyclePersona} onTouchEnd={cyclePersona}>
					{getPersonaName(persona)}
				</button>
				<button onClick={toggleReply} onTouchEnd={toggleReply}>
					<FaCircle
						color={shallReply ? 'var(--color-highlight)' : 'var(--color-bg3)'}
					/>
					REP
				</button>
				<button onClick={toggleContinue} onTouchEnd={toggleContinue}>
					<FaCircle
						color={
							shallContinue ? 'var(--color-highlight)' : 'var(--color-bg3)'
						}
					/>
					CONT
				</button>
				<button onClick={toggleSpecial} className={styles.timeButton}>
					{isSpecial ? (
						<FaCircleDot color={'var(--color-highlight)'} />
					) : (
						<FaCircle color={'var(--color-text-faint)'} />
					)}
				</button>
			</div>
			<div className={styles.bottomPanel}>
				<button
					onClick={cyclePersona}
					onTouchEnd={cyclePersona}
					className={styles.avatarButton}
				>
					<Avatar persona={persona} />
				</button>

				<TextInput
					placeholder='...'
					autoFocus
					ref={textAreaRef}
					value={inputValue}
					className={styles.input}
					onChange={handleChange}
					onKeyDown={handleTextAreaKeydown}
				/>
				<button className={styles.submitButton} onClick={handleSubmit}>
					<span className={styles.submitButtonText}>TRANSMIT</span>
					<FaChevronRight />
				</button>
			</div>
		</div>
	);
};
