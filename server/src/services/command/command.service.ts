import { ChatMessage, CommandEnum } from '../../../../types';
import { Context } from '../../context';
import { BusEventEnum, EventBus } from '../../lib/eventBus';
import { replaceTemplates } from '../../lib/replaceTemplates';
import { exec } from '../../util/exec';
import { ChatActionsService } from '../chat-action/chatAction.service';
import { Config } from '../config/config.service';
import { SocketClientService } from '../socket-client/socket.client.service';

class CommandsServiceFactory {
	constructor() {
		EventBus.on(BusEventEnum.MESSAGE_UPDATED, (event) => {
			this.parseCommands(event.data as ChatMessage);
			this.parseKeywords(event.data as ChatMessage);
		});
	}

	parseKeywords = ({ messages, activeIdx }: ChatMessage) => {
		const message = messages[activeIdx];
		const specialOnRegex = new RegExp(`${replaceTemplates('{{special}}')}: On`);
		const specialOffRegex = new RegExp(
			`${replaceTemplates('{{special}}')}: Off`
		);
		switch (true) {
			case specialOnRegex.test(message):
				this.enterSpecial();
				break;
			case specialOffRegex.test(message):
				this.exitSpecial();
				break;
			case /Music: On/i.test(message):
				this.playMusic();
				break;
			case /Music: Off/i.test(message):
				this.stopMusic();
				break;
		}
	};

	enterSpecial = () => {
		console.log('Special: On');
		Context.isSpecialMode = true;
		ChatActionsService.narrateSystemAndMaybeTrigger(Config.Chat.specialEnter);
		SocketClientService.onSpecialToggle(true);
	};

	exitSpecial = () => {
		console.log('Special: Off');
		Context.isSpecialMode = false;
		ChatActionsService.narrateSystemAndMaybeTrigger(Config.Chat.specialExit);
		SocketClientService.onSpecialToggle(false);
	};

	playMusic = () => {
		exec(`osascript -e 'tell app "Swinsian" to play'`);
		ChatActionsService.narrateSystemAndMaybeTrigger('Music starts playing.');
	};

	stopMusic = () => {
		exec(`osascript -e 'tell app "Swinsian" to pause'`);
		ChatActionsService.narrateSystemAndMaybeTrigger('Music stops playing.');
	};

	parseCommands = ({ messages, activeIdx }: ChatMessage) => {
		const regex = /@invoke\((.*)\)/g;
		const commands: string[] = [];
		let command: RegExpExecArray;
		while ((command = regex.exec(messages[activeIdx]))) {
			commands.push(command[1]);
		}

		commands.length && console.log('got commands:', commands);

		for (const command of commands) {
			const [type, value] = command
				.split(',')
				.map((c) => c.replace(/\"/g, '')) as [CommandEnum, string | undefined];
			console.log('handling:', command, type);
			switch (type) {
				case CommandEnum.STATUS:
					Context.status = value;
					break;
				case CommandEnum.PLAY_MUSIC:
					this.stopMusic();
					break;
				case CommandEnum.PAUSE_MUSIC:
					this.stopMusic();
					break;
				case CommandEnum.ENABLE_SPECIAL:
					Context.isSpecialMode = true;
					break;
				case CommandEnum.DISABLE_SPECIAL:
					Context.isSpecialMode = false;
					break;
			}
		}
	};
}

export const CommandsService = new CommandsServiceFactory();
