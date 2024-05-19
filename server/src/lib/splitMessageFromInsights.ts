export const splitMessageFromInsights = (
	message: string,
	ignoreThought?: boolean
) => {
	const text = message
		.replace(/<thinking: $/g, '*Thinking...*')
		.replace(/<thinking: [^>]*(>){0,1}/g, '')
		.replace(/<note: [^>]*(>){0,1}/g, '');

	const thought = ignoreThought
		? ''
		: message
				.replace(/<thinking: $/g, '')
				.match(/<thinking: ([^>]*)(>){0,1}/g)?.[0]
				.replace(/<thinking: ([^>]*)(>){0,1}/g, '*$1*');

	const note = message
		.match(/<note: ([^>]*)(>){0,1}/g)?.[0]
		.replace(/<note: ([^>]*)(>){0,1}/g, '*$1*');

	return { text, thought, note };
};
