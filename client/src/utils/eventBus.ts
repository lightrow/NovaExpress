import { Subject, filter } from 'rxjs';

export enum BusEventEnum {
	CHAT_RECEIVED = 'chatReceived',
	DIALOG = 'dialog',
	BOTTOM_PANEL_HEIGHT = 'bottomPanelHeight',
}

const RESPONSE_KEY = ':res';

export interface IEvent<T = unknown> {
	key: string;
	data?: T;
	response?: { error?: Error; data?: T };
	timestamp: number;
}

const EventSubject = new Subject<IEvent>();

const getEventSubject = <T>() => EventSubject as Subject<IEvent<T>>;

const on = <T>(key: string, callback: (event: IEvent<T>) => void) => {
	const sub = getEventSubject<T>()
		.pipe(filter((event) => event.key === key))
		.subscribe(callback);
	return sub;
};

const onAsync = <T, K>(
	key: string,
	callback: (event: IEvent<T>) => Promise<K>
) => {
	const sub = on<T>(key, async (responseEvent) => {
		try {
			const data = await callback(responseEvent);
			respond({
				timestamp: responseEvent.timestamp,
				key: responseEvent.key,
				response: {
					data,
				},
			});
		} catch (error) {
			respond({
				timestamp: responseEvent.timestamp,
				key: responseEvent.key,
				response: {
					error: error as Error,
				},
			});
		}
	});
	return sub;
};

const send = <T>(event: Omit<IEvent<T>, 'response' | 'timestamp'>) => {
	getEventSubject<T>().next({ ...event, timestamp: new Date().getTime() });
};

const sendAsync = <T>(event: Omit<IEvent<T>, 'response' | 'timestamp'>) => {
	const ev = { ...event, timestamp: new Date().getTime() };
	return new Promise((resolve, reject) => {
		const sub = on(event.key + RESPONSE_KEY, (responseEvent) => {
			if (ev.timestamp !== responseEvent.timestamp) {
				return;
			}
			if (responseEvent?.response?.error) {
				reject(responseEvent.response.error);
			} else {
				resolve(responseEvent?.response?.data);
			}
			sub.unsubscribe();
		});
		getEventSubject<T>().next(ev);
	});
};

const respond = <T>(event: Omit<IEvent<T>, 'data'>) => {
	getEventSubject<T>().next({ ...event, key: event.key + RESPONSE_KEY });
};

export const EventBus = {
	on,
	onAsync,
	send,
	sendAsync,
	respond,
};
