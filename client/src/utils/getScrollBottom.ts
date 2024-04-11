export const getScrollBottom = () => {
	return (
		document.documentElement.scrollHeight -
		window.innerHeight -
		document.documentElement.scrollTop
	);
};
