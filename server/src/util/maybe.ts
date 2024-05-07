export const yesOrNo = (fn?: () => void) => {
	const shouldTrigger = !!Math.floor(Math.random() + 0.5);
	shouldTrigger && fn?.();
	return shouldTrigger;
};
