export const checkIsElementInViewport = (el: Element, partial?: boolean) => {
	const { top, left, bottom, right } = el.getBoundingClientRect();
	const { innerHeight, innerWidth } = window;
	if (partial) {
		return (
			bottom >= 0 &&
			right >= 0 &&
			top <= (window.innerHeight || document.documentElement.clientHeight) &&
			left <= (window.innerWidth || document.documentElement.clientWidth)
		);
	}
	return top >= 0 && left >= 0 && bottom <= innerHeight && right <= innerWidth;
};
