import { ChatMessage } from '../../../../types';
import { selectRandomWeighted } from '../../util/selectRandomWeighted';
import { Config } from '../config/config.service';

export class MoodService {
	static lastMood = '';
	static currentCycle = 0;
	static MAX_CYCLES = 0;

	static generateNextMood = (chat: ChatMessage[]) => {
		if (this.currentCycle >= this.MAX_CYCLES) {
			const moods = Object.keys(Config.Chat.mood) as string[];
			const weights = Object.values(Config.Chat.mood) as number[];
			const newMood = selectRandomWeighted(moods, weights);
			this.currentCycle = 0;
			this.lastMood = newMood;
			// this.maxRandomMoodCycles = selectRandomWeighted(
			// 	[0, 1, 2, 3],
			// 	[1, 2, 3, 1]
			// );
			return newMood;
		} else {
			if (chat.slice(-1)[0].persona === 'char') {
				this.currentCycle++;
			}
			return this.lastMood;
		}
	};
}
