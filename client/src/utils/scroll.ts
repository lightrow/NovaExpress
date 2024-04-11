import { animate, easeInOutCubic } from './animate';
import { interpolate } from './interpolate';

export const scroll = (to: number, duration = 200) => {
	let start = window.scrollY;
	animate({
		timing: easeInOutCubic,
		draw: (progress) => {
			document.documentElement.scrollTop = interpolate(progress, {
				from: [0, 1],
				to: [
					start,
					to === -1
						? document.documentElement.scrollHeight - window.innerHeight
						: to,
				],
			});
		},
		duration: 200,
	});
};
