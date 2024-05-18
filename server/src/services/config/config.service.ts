import { ChatManagerService } from '../chat-manager/chat-manager.service';
import { FileService } from '../fs/fs.service';

export class Config {
	static get Template() {
		return FileService.getConfigFile('template.txt');
	}

	static get TemplateFormat() {
		return JSON.parse(FileService.getConfigFile('format.json')) as {
			promptPrefix: string;
			promptSuffix: string;

			directionPrefix: string;
			narratorPrefix: string;
			personaPrefix: string;

			directionSuffix: string;
			narratorSuffix: string;
			personaSuffix: string;

			inputPrefix: string;
			outputPrefix: string;
			systemPrefix: string;
			inputSuffix: string;
			outputSuffix: string;
			systemSuffix: string;

			chatFormat: boolean;
			maintainInputOutputSequence: boolean;
			directionRole: 'input' | 'output' | 'system';
			narratorRole: 'input' | 'output' | 'system';
		};
	}

	static get Intro() {
		return FileService.getConfigFile('intro.txt') || '';
	}

	static get ExampleChat() {
		return JSON.parse(FileService.getConfigFile('example.txt') || '[]');
	}

	static get Llm() {
		return JSON.parse(FileService.getConfigFile('promptConfig.json'));
	}

	static get Chat() {
		return JSON.parse(
			FileService.getDataFile(ChatManagerService.curDir + 'chatConfig.json')
		);
	}

	static get SystemPrompt() {
		return FileService.getDataFile(ChatManagerService.curDir + 'system.txt');
	}

	static get Urls() {
		return JSON.parse(FileService.getConfigFile('urls.json'));
	}
}
