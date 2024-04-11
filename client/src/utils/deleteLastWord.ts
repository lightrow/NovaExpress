export const deleteLastWord = (sentence: string) => {
	// Regular expression to match the last word and its adjacent punctuation
	const lastWordRegex = /\s*[\w'-]*(\S\W)*$/;

	// Find the last word and its adjacent punctuation
	const match = sentence.match(lastWordRegex);

	// If no match found, return the original sentence
	if (!match) {
		return sentence;
	}

	// Extract the last word and its adjacent punctuation
	const lastWordWithPunctuation = match[0];
	const lastWord = match[1];

	// Remove the last word and its adjacent punctuation from the sentence
	const newSentence = sentence.replace(lastWordWithPunctuation, '');

	return newSentence.trim(); // Trim any leading/trailing whitespace
};
