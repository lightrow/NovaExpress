export const checkIsGarbageBrowser = () =>
	/^((?!chrome|android).)*safari/i.test(navigator.userAgent);
