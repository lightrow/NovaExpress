import { format } from 'date-fns';
import { ChatMessage } from '../../../../types';
import { FileService } from '../fs/fs.service';

export class NotebookService {
	static NOTEBOOK_FILE = 'notebook.txt';

	static get Notebook() {
		const content = FileService.getDataFile(this.NOTEBOOK_FILE);
		if (content === null) {
			FileService.writeToDataFile(this.NOTEBOOK_FILE, '');
		}
		return content || '';
	}

	static parseAndUpdateNotebook = ({ messages, activeIdx }: ChatMessage) => {
		const message = messages[activeIdx].toLowerCase();
		const triggerWordPresent =
			message.includes('note') ||
			message.includes('notebook') ||
			message.includes('noted') ||
			message.includes('noting');

		const content = message.match(/"(.*?)"/g)?.[0]?.slice(1, -1);

		if (triggerWordPresent && content) {
			FileService.appendToDataFile(
				this.NOTEBOOK_FILE,
				format(new Date(), 'do MMMM, hh:mma') + '\n' + content
			);
		}
	};
}
