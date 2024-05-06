import { ChatMessage } from '../../../types';
import { Config } from '../services/config/config.service';
import { replaceTemplates } from './replaceTemplates';

export const sendPush = async (message: ChatMessage) => {
	try {
		// remove to enable
		return;
		await fetch(Config.Urls.urlPush, {
			method: 'POST',
			headers: {
				Title: replaceTemplates('{{' + message.persona + '}}'),
			},
			body: message.messages[message.activeIdx],
		});
	} catch (error) {
		console.warn('Push failed:', error);
	}
};
