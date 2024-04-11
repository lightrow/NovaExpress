export const checkIsMobile = () => {
	return 'ontouchstart' in window || navigator.maxTouchPoints;
};
