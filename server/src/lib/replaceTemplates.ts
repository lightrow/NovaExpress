import { format } from 'date-fns';
import { Config } from '../services/config/config.service';
import { NotebookService } from '../services/notebook/notebook.service';

export const replaceTemplates = (s: string) => {
	if (!s) {
		return s;
	}

	return s
		.replace(/{{system}}/g, Config.SystemPrompt)
		.replace(/{{user}}/g, Config.Chat.userName)
		.replace(/{{char}}/g, Config.Chat.charName)
		.replace(/{{narrator}}/g, Config.Chat.narratorName)
		.replace(/{{time}}/g, format(new Date().getTime(), 'hh:mma'))
		.replace(/{{weekday}}/g, format(new Date().getTime(), 'eeee'))
		.replace(/{{date}}/g, format(new Date().getTime(), 'do MMMM'))
		.replace(/{{systemPrefix}}/g, Config.TemplateFormat.systemPrefix)
		.replace(/{{systemSuffix}}/g, Config.TemplateFormat.systemSuffix)
		.replace(/{{notebook}}/g, NotebookService.Notebook);
};
