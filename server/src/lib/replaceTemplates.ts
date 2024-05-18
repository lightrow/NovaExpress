import { format } from 'date-fns';
import { Config } from '../services/config/config.service';

export const replaceTemplates = (s: string) => {
	if (!s) {
		return s;
	}

	return s
		.replace(/{{systemPrompt}}/g, Config.SystemPrompt)
		.replace(/{{user}}/g, Config.Chat.userName)
		.replace(/{{char}}/g, Config.Chat.charName)
		.replace(/{{narrator}}/g, Config.Chat.narratorName)
		.replace(/{{system}}/g, Config.Chat.systemName)
		.replace(/{{special}}/g, Config.Chat.specialName)
		.replace(/{{time}}/g, format(new Date().getTime(), 'hh:mma'))
		.replace(/{{weekday}}/g, format(new Date().getTime(), 'eeee'))
		.replace(/{{date}}/g, format(new Date().getTime(), 'do MMMM'))
		.replace(/{{promptPrefix}}/g, Config.TemplateFormat.promptPrefix)
		.replace(/{{promptSuffix}}/g, Config.TemplateFormat.promptSuffix)
		.replace(/{{inputPrefix}}/g, Config.TemplateFormat.inputPrefix)
		.replace(/{{inputSuffix}}/g, Config.TemplateFormat.inputSuffix)
		.replace(/{{outputPrefix}}/g, Config.TemplateFormat.outputPrefix)
		.replace(/{{outputSuffix}}/g, Config.TemplateFormat.outputSuffix)
		.replace(/{{systemPrefix}}/g, Config.TemplateFormat.systemPrefix)
		.replace(/{{systemSuffix}}/g, Config.TemplateFormat.systemSuffix);
};
