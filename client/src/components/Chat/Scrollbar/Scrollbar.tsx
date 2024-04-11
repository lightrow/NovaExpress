import classNames from 'classnames';
import { FC, RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { useUpdateEffect } from '../../../hooks/useUpdateEffect';
import styles from './Scrollbar.module.css';
import { format } from 'date-fns';
import { checkIsGarbageBrowser } from '../../../utils/checkIsGarbageBrowser';

export const ListScrollbar: FC<{
	itemsLength: number;
	visibleItems: number[];
	listRef: RefObject<HTMLDivElement>;
	dates: number[];
}> = ({ visibleItems: visibleItems, itemsLength, listRef, dates }) => {
	const currentIndex = (() => {
		if (visibleItems.length === itemsLength) {
			return -1;
		}
		if (!visibleItems.length) {
			return -1;
		}
		if (visibleItems.includes(0)) {
			return 0;
		}
		if (visibleItems.includes(itemsLength - 1)) {
			return itemsLength - 1;
		}
		return visibleItems[Math.floor(visibleItems.length / 2)];
	})();

	const scrollToIndex = useCallback((idx: number) => {
		const list = listRef.current;
		if (!list) {
			return;
		}
		const item = list.children[idx];
		item.scrollIntoView({ behavior: 'instant', block: 'center' });
	}, []);

	const isTimelineVisible = currentIndex > -1 && currentIndex < itemsLength - 2;
	const currentOffset = useRef(0);
	const [displayedIndex, setDisplayedIndex] = useState(currentIndex);
	const [isTooltipVisible, setIsTooltipVisible] = useState(false);
	const trackRef = useRef<HTMLDivElement>(null);
	const thumbRef = useRef<HTMLDivElement>(null);

	const calculateOnTouch = useCallback(
		(start: number) => {
			setIsTooltipVisible(true);
			const track = trackRef.current!;
			const thumb = thumbRef.current!;
			const trackLength = track.clientWidth;
			const thumbSize = thumb.clientWidth;
			const totalPath = trackLength - thumbSize;

			let index = currentIndex;
			const onMove = (e: any) => {
				e.preventDefault();
				e.stopPropagation();
				const mouseMoveDelta = (e.clientX || e.touches[0].clientX) - start;
				const offset = Math.max(
					0,
					Math.min(totalPath, currentOffset.current + mouseMoveDelta)
				);
				index = Math.round((offset / totalPath) * (itemsLength - 1));
				setDisplayedIndex(index);
				thumb.style.transform = `translateX(${offset}px)`;
			};
			const onUp = (e: MouseEvent) => {
				e.preventDefault();
				e.stopPropagation();
				setIsTooltipVisible(false);
				if (index !== currentIndex) {
					scrollToIndex(index);
				}
				document.removeEventListener('mouseup', onUp);
				document.removeEventListener('mousemove', onMove);
				document.removeEventListener('touchend', onUp);
				document.removeEventListener('touchmove', onMove);
			};
			document.addEventListener('mousemove', onMove);
			document.addEventListener('touchmove', onMove);
			document.addEventListener('mouseup', onUp);
			document.addEventListener('touchend', onUp);
		},
		[currentIndex, itemsLength]
	);

	const onTouchDown = useCallback(
		(e: React.TouchEvent<HTMLDivElement>) => {
			e.preventDefault();
			e.stopPropagation();
			e.stopPropagation();
			calculateOnTouch(e.touches[0].clientX);
		},
		[currentIndex, itemsLength]
	);

	const onDown = useCallback(
		(e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
			e.preventDefault();
			e.stopPropagation();
			calculateOnTouch(e.clientX);
		},
		[currentIndex, itemsLength]
	);

	const calculatePosition = () => {
		const track = trackRef.current;
		const thumb = thumbRef.current;
		const trackLength = track.clientWidth;
		const thumbSize = thumb.clientWidth;
		const totalPath = trackLength - thumbSize;

		const ratio = (currentIndex ? currentIndex + 1 : 0) / itemsLength;
		const offset = ratio * totalPath;
		currentOffset.current = offset;

		thumb.style.transform = `translateX(${offset}px)`;
		track.style.opacity = '1';
	};

	useUpdateEffect(() => {
		if (currentIndex === -1) {
			return;
		}
		setDisplayedIndex(currentIndex);
		calculatePosition();
	}, [itemsLength, currentIndex]);

	useEffect(() => {
		const onResize = () => {
			calculatePosition();
		};
		window.addEventListener('resize', onResize);
		return () => {
			window.removeEventListener('resize', onResize);
		};
	}, [currentIndex, itemsLength]);

	if (checkIsGarbageBrowser() && currentIndex === -1) {
		return null;
	}

	return (
		<div
			className={classNames(styles.container, {
				[styles.slide]: isTimelineVisible,
			})}
		>
			<div className={styles.track} ref={trackRef}>
				<div
					className={styles.thumb}
					ref={thumbRef}
					onTouchStart={onTouchDown}
					onMouseDown={onDown}
				>
					<div className={styles.thumbKnob} />
					<div
						className={classNames(styles.tooltip, {
							[styles.visible]: isTooltipVisible,
						})}
					>
						<span>
							{displayedIndex + 1} / {itemsLength}
						</span>
						{!!dates[displayedIndex] && (
							<span>{format(dates[displayedIndex], 'do MMM')}</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
