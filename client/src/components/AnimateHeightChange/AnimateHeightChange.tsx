import {
	MotionProps,
	ValueAnimationTransition,
	animate,
	motion,
	useMotionValue,
} from 'framer-motion';
import { FC, ReactNode, useEffect, useRef } from 'react';
import { useUpdateEffect } from '../../hooks/useUpdateEffect';

interface AnimateChangeInHeightProps extends MotionProps {
	children: ReactNode;
	className?: string;
	containerClassName?: string;
	hideOverflow?: boolean;
	animateKey?: unknown; // If provided, will only animate height when animateKey updates
}

export const AnimateHeightChange: FC<AnimateChangeInHeightProps> = ({
	children,
	className,
	containerClassName,
	hideOverflow,
	animateKey,
	style,
	transition = { duration: 0.3, ease: [0.18, 1.01, 0.46, 0.98] },
	...rest
}) => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const height = useMotionValue('auto');
	const hasKeyChanged = useRef(false);

	const animateHeight = async (to: number | string) => {
		animate(
			height,
			typeof to === 'string' ? to : to + 'px',
			transition as ValueAnimationTransition
		);
	};

	const applyHeight = (to: number | string) => {
		height.set(typeof to === 'string' ? to : to + 'px');
	};

	useUpdateEffect(() => {
		hasKeyChanged.current = true;
	}, [animateKey]);

	useEffect(() => {
		if (containerRef.current) {
			const resizeObserver = new ResizeObserver(async (entries) => {
				const observedHeight = entries[0].contentRect.height;
				if (
					animateKey !== undefined &&
					!hasKeyChanged.current &&
					!height.isAnimating()
				) {
					applyHeight(observedHeight);
				} else {
					animateHeight(observedHeight);
				}
				hasKeyChanged.current = false;
			});
			resizeObserver.observe(containerRef.current);
			return () => {
				resizeObserver.disconnect();
			};
		}
	}, []);

	return (
		<motion.div
			transition={transition}
			style={{
				...style,
				...(hideOverflow && { overflow: 'hidden' }),
				height,
			}}
			className={containerClassName}
			{...rest}
		>
			<div ref={containerRef} className={className}>
				{children}
			</div>
		</motion.div>
	);
};
