import { format } from 'date-fns';
import { ChatMessage } from '../../../../types';
import { FileService } from '../fs/fs.service';
import { EventBus, BusEventEnum } from '../../lib/eventBus';
import { replaceTemplates } from '../../lib/replaceTemplates';

class NotebookServiceFactory {
	constructor() {
		EventBus.on(BusEventEnum.MESSAGE_UPDATED, (event) => {
			this.parseAndUpdateNotebook(event.data as ChatMessage);
		});
	}

	NOTEBOOK_FILE = 'notebook.txt';

	get Notebook() {
		const content = FileService.getDataFile(this.NOTEBOOK_FILE);
		if (content === null) {
			FileService.writeToDataFile(this.NOTEBOOK_FILE, '');
		}
		return (content || '').trim();
	}

	parseAndUpdateNotebook = ({
		messages,
		date,
		activeIdx,
		persona,
	}: ChatMessage) => {
		const message = messages[activeIdx];
		const note = message.match(/<note: ([^>]*)>/)?.[1];

		if (note) {
			FileService.appendToDataFile(
				this.NOTEBOOK_FILE,
				replaceTemplates(
					`{{${persona}}} noted on ${format(
						date,
						'do MMMM, hh:mma'
					)}:\n${note}\n\n`
				)
			);
		}
	};
}

export const NotebookService = new NotebookServiceFactory();
