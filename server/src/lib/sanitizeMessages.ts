import { ChatMessage } from '../../../types';
import { Config } from '../services/config/config.service';

const EMOJI_REGEX =
	'(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?(?:\u200d(?:[^\ud800-\udfff]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff])[\ufe0e\ufe0f]?(?:[\u0300-\u036f\ufe20-\ufe23\u20d0-\u20f0]|\ud83c[\udffb-\udfff])?)*';

const emojis = [
	EMOJI_REGEX,
	':\\$',
	';\\$',
	':\\)',
	';\\)',
	':\\*',
	';\\*',
	':D',
	';D',
	';3',
	':P',
	';P',
	';\\^\\)',
	':\\^\\)',
	':^D',
	';^D',
	'xD',
	'<3',
	':$', // not a typo
	';$',
];

// Useful for some crazy prompts that enforce specific speech style that can
// cause output degradation cascade, with model returning nothing but
// combination of emojis and punctuation gibberish.
export const maybeSanitizeMessages = (chat: ChatMessage[]) => {
	return !Config.Chat.enableSanitize
		? chat
		: chat.map((message) => {
				return {
					...message,
					messages: message.messages.map((message) =>
						// ^^ great naming bro
						replaceEmojis(message)
							// multiple ~~~~
							.replace(/~+/g, '~')
							// punctuation
							.replace(/,$/g, '.')
							.replace(/,\./g, '.')
							.replace(/\.,/g, '.')
							.replace(/,{2,}/g, '...')
							.replace(/\.{4,}/g, '...')
							.replace(/([^.]|^)\.\.([^.]|$)/g, '$1.$2')
							.replace(/\!\.+/g, '!')
							.replace(/\?\.+/g, '?')
							.replace(/^(\.)(?!\.\.)/, '')
					),
				};
		  });
};

const replaceEmojis = (message: string) => {
	let finalMessage = message;
	emojis.forEach((emoji) => {
		const regexp = new RegExp(`${emoji}(?![\d\w])`, 'gi');
		const regexpWithWhitespace = new RegExp(`\\s${emoji}(?![\d\w])`, 'gi');
		finalMessage = finalMessage.replace(regexpWithWhitespace, '.');
		finalMessage = finalMessage.replace(regexp, '');
	});
	return finalMessage;
};
