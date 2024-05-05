import { FC, PropsWithChildren, useEffect, useRef, useState } from 'react';
import { getScrollBottom } from '../../utils/getScrollBottom';

export const HeightStabilizer: FC<PropsWithChildren> = ({ children }) => {
	const parentRef = useRef<HTMLDivElement>(null);
	const ref = useRef<HTMLDivElement>(null);
	const minHeight = useRef(0);
	const contentHeight = useRef(minHeight.current);

	useEffect(() => {
		const handleScroll = () => {
			const scrollBottom = getScrollBottom();
			const heightDelta = minHeight.current - contentHeight.current;
			if (
				(heightDelta > 0 && scrollBottom >= heightDelta - 1) ||
				contentHeight.current < document.documentElement.scrollTop
			) {
				minHeight.current = contentHeight.current;
				parentRef.current.style.minHeight = contentHeight.current + 'px';
			}
		};
		window.addEventListener('scroll', handleScroll);
		const observer = new ResizeObserver(([el]) => {
			contentHeight.current = el.contentRect.height;
			const newMinHeight = Math.max(minHeight.current, el.contentRect.height);
			minHeight.current = newMinHeight;
			parentRef.current.style.minHeight = newMinHeight + 'px';
		});
		observer.observe(ref.current);
		return () => {
			window.removeEventListener('scroll', handleScroll);
			observer.disconnect();
		};
	}, []);

	return (
		<div ref={parentRef}>
			<div ref={ref}>{children}</div>
		</div>
	);
};
