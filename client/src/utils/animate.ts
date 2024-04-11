export const animate = ({
	timing,
	draw,
	duration,
}: {
	timing: (x: number) => number;
	draw: (progress: number) => void;
	duration: number;
}) => {
	const start = performance.now();

	requestAnimationFrame(function animate(time) {
		let timeFraction = (time - start) / duration;
		if (timeFraction > 1) {
			timeFraction = 1;
		}

		const progress = timing(timeFraction);

		draw(progress);

		if (timeFraction < 1) {
			requestAnimationFrame(animate);
		}
	});
};

export const easeOutCubic = (x: number) => {
	return 1 - Math.pow(1 - x, 3);
};

export const easeInOutCubic = (x: number) => {
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

export const easeInOutExpo = (x: number) => {
	return x === 0
		? 0
		: x === 1
		? 1
		: x < 0.5
		? Math.pow(2, 20 * x - 10) / 2
		: (2 - Math.pow(2, -20 * x + 10)) / 2;
};

export const easeOutExpo = (x: number) => {
	return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
};
