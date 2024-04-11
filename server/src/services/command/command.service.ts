import { ChatMessage, CommandEnum } from '../../../../types';
import { Context } from '../../context';
import { BusEventEnum, EventBus } from '../../lib/eventBus';
import { exec } from '../../util/exec';
import { ChatActionsService } from '../chat-action/chatAction.service';

class CommandsServiceFactory {
	constructor() {
		EventBus.on(BusEventEnum.MESSAGE_UPDATED, (event) => {
			this.parseCommands(event.data as ChatMessage);
		});
	}

	parseCommands = ({ messages, activeIdx }: ChatMessage) => {
		const regex = /@invoke\((.*)\)/g;
		const commands: string[] = [];
		let command: RegExpExecArray;
		while ((command = regex.exec(messages[activeIdx]))) {
			commands.push(command[1]);
		}

		commands.length && console.log('got commands:', commands);

		for (const command of commands) {
			const [type, _] = command.split(',').map((c) => c.replace(/\"/g, '')) as [
				CommandEnum,
				string | undefined
			];
			console.log('handling:', command, type);
			switch (type) {
				case CommandEnum.PLAY_MUSIC:
					exec(`osascript -e 'tell app "Swinsian" to play'`);
					ChatActionsService.narrateAndTrigger('Music starts playing.');
					break;
				case CommandEnum.PAUSE_MUSIC:
					exec(`osascript -e 'tell app "Swinsian" to pause'`);
					ChatActionsService.narrateAndTrigger('Music stops playing.');
					break;
				case CommandEnum.ENABLE_RAIN:
					ChatActionsService.narrateAndTrigger(
						'Rain projection activates. Sound of raindrops fills the room.'
					);
					break;
				case CommandEnum.DISABLE_RAIN:
					ChatActionsService.narrateAndTrigger(
						'Rain projection deactivates. Ambience returns back to normal.'
					);
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
