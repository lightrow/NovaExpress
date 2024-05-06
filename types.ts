export interface ChatMessage {
	//message?: string;
	messages: string[];
	activeIdx: number;
	date: number;
	persona: 'user' | 'char' | 'narrator' | 'system';
	state?: 'pinned' | 'pruned' | 'none';
	affinity?: number;
}

export enum SocketEventEnum {
	ADD_MESSAGE_AND_REPLY = 'addMessage',
	ADD_MESSAGE_NO_REPLY = 'addMessageNoPrompt',
	ADD_MESSAGE_AND_CONTINUE = 'triggerChar',
	CONTINUE = 'continue',
	RETRY = 'retry',
	STOP = 'stop',
	CUT = 'cut',
	PRUNE = 'prune',
	EDIT_MESSAGE = 'editMessage',
	DELETE_MESSAGE = 'deleteMessage',
	TOGGLE_PIN_MESSAGE = 'togglePinMessage',
	BRANCH_AT_MESSAGE = 'branchAtMessage',
	CHATS_LIST = 'chatsList',
	LOAD_CHAT = 'loadChat',
	DELETE_CHAT = 'deleteChat',
	TOGGLE_SPECIAL = 'toggleSpecial',
}

export enum SocketServerEventEnum {
	MESSAGE_RECEIVED = 'messageReceived',
	MESSAGE_CHUNK_RECEIVED = 'messageChunkReceived',
	MESSAGE_DELETED = 'messageDeleted',
	MESSAGE_CHAT_RECEIVED = 'chatReceived',
	STREAM_END = 'streamEnd',
	CUTOFF_POSITION = 'cutoffPosition',
	CHATS_LIST = 'chatsList',
}

export enum CommandEnum {
	PLAY_MUSIC = 'playMusic',
	PAUSE_MUSIC = 'pauseMusic',
	ENABLE_RAIN = 'enableRain',
	DISABLE_RAIN = 'disableRain',
	ENABLE_SPECIAL = 'enableSpecial',
	DISABLE_SPECIAL = 'disableSpecial',
}

export interface ChatListEntry {
	lastMessage: ChatMessage;
	id: number; // is also date
	active: boolean;
	system: string;
	personas: {
		role: ChatMessage['persona'];
		name: string;
		avatars: {
			default: string;
			affinity_1?: string;
			affinity_2?: string;
			affinity_3?: string;
			affinity_4?: string;
			affinity_5?: string;
			special?: string;
		};
	}[];
}
