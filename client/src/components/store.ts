import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { ChatListEntry, ChatMessage } from '../../../types';

export enum Route {
	CHAT = 'CHAT',
	PINS = 'PINS',
	CHATS = 'CHATS',
	SETTINGS = 'SETTINGS',
}
export interface AppStore {
	setIsInferring: (i: boolean) => void;
	isInferring: boolean;

	isSending: boolean;
	toggleIsSending: (v: boolean) => void;

	setMessages: (m: ChatMessage[]) => void;
	updateMessage: (m: ChatMessage) => void;
	deleteMessage: (m: ChatMessage) => void;
	loadChat: (chat: ChatMessage[]) => void;
	messages: ChatMessage[];

	updateChatsList: (entries: ChatListEntry[]) => void;
	chatsList: ChatListEntry[];

	setRoute: (r: Route) => void;
	route: Route;

	updateCutoffPosition: (position: number) => void;
	cutoffPosition: number;

	toggleSoundMode: () => void;
	soundMode: 'beep' | 'tts' | 'none';

	updateTTSUrl: (url: string) => void;
	ttsUrl: string;

	updateTTSVolume: (volume: number) => void;
	ttsVolume: number;

	updateBeepVolume: (volume: number) => void;
	beepVolume: number;

	updateServerUrl: (url: string) => void;
	serverUrl: string;

	updateWsUrl: (url: string) => void;
	wsUrl: string;

	isSSTEnabled: boolean;
	toggleSST: () => void;

	isSpecialMode: boolean;
	toggleSpecialMode: (val?: boolean) => void;

	isAway: boolean;
	toggleIsAway: (val?: boolean) => void;

	alwaysShowInsights: boolean;
	toggleAlwaysShowInsights: (val?: boolean) => void;
}

export const useGlobalStore = create(
	persist(
		immer<AppStore>((set, get) => ({
			setMessages: (m) =>
				set((state) => {
					state.messages = m;
				}),
			updateMessage: (m) =>
				set((state) => {
					const existingIdx = state.messages.findIndex(
						(message) => message.date === m.date
					);
					if (existingIdx > -1) {
						state.messages[existingIdx] = m;
					} else {
						state.messages.push(m);
					}
				}),
			deleteMessage: (m) =>
				set((state) => {
					const existingIdx = state.messages.findIndex(
						(message) => message.date === m.date
					);
					if (existingIdx > -1) {
						state.messages.splice(existingIdx, 1);
					}
				}),
			loadChat: (chat) =>
				set((state) => {
					state.messages = chat;
				}),
			messages: [],

			setIsInferring: (isInferring) =>
				set((state) => {
					state.isInferring = isInferring;
				}),
			isInferring: false,

			setRoute: (r) =>
				set((state) => {
					state.route = r;
				}),
			route: Route.CHAT,

			updateCutoffPosition: (position) =>
				set((state) => {
					state.cutoffPosition = position;
				}),
			cutoffPosition: 0,

			toggleSoundMode: () =>
				set((state) => {
					const modes = ['beep', 'none', 'tts'] as const;
					state.soundMode =
						modes[(modes.indexOf(state.soundMode) + 1) % modes.length];
				}),
			soundMode: 'beep',

			updateTTSUrl: (url) =>
				set((state) => {
					state.ttsUrl = url;
				}),
			ttsUrl: 'http://localhost:8001/api/v1/static',

			updateTTSVolume: (volume) =>
				set((state) => {
					state.ttsVolume = volume;
				}),
			ttsVolume: 50,

			updateBeepVolume: (volume) =>
				set((state) => {
					state.beepVolume = volume;
				}),
			beepVolume: 50,

			isSSTEnabled: false,
			toggleSST: () =>
				set((state) => {
					state.isSSTEnabled = !state.isSSTEnabled;
				}),

			updateWsUrl: (url) =>
				set((state) => {
					state.wsUrl = url;
				}),
			wsUrl: 'ws://localhost:3001',

			updateServerUrl: (url) =>
				set((state) => {
					state.serverUrl = url;
				}),
			serverUrl: 'http://localhost:3001',

			updateChatsList: (list) =>
				set((state) => {
					state.chatsList = list;
				}),
			chatsList: [],

			isSpecialMode: false,
			toggleSpecialMode: (val) =>
				set((state) => {
					state.isSpecialMode = val !== undefined ? val : !state.isSpecialMode;
				}),

			isSending: false,
			toggleIsSending: (val) =>
				set((state) => {
					state.isSending = val !== undefined ? val : !state.isSending;
				}),

			isAway: false,
			toggleIsAway: (val) =>
				set((state) => {
					state.isAway = val !== undefined ? val : !state.isAway;
				}),

			alwaysShowInsights: false,
			toggleAlwaysShowInsights: (val) =>
				set((state) => {
					state.alwaysShowInsights =
						val !== undefined ? val : !state.alwaysShowInsights;
				}),
		})),
		{
			name: 'store',
			storage: createJSONStorage(() => localStorage),
			partialize: ({ isInferring, chatsList, messages, ...state }) => ({
				...state,
			}),
		}
	)
);
