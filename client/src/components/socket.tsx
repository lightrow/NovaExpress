// useWebsocket.js

import {
	FC,
	PropsWithChildren,
	createContext,
	useContext,
	useEffect,
	useState,
} from 'react';

const SocketContext = createContext<ReturnType<typeof useCreateSocket> | null>(
	null
);

const useCreateSocket = () => {
	const [worker] = useState<Worker>(
		new Worker(new URL('./websocketWorker.js', import.meta.url))
	);

	const connect = (url: string) => {
		worker.postMessage({
			type: 'connect',
			payload: { url },
		});
	};

	const focus = () => {
		worker.postMessage({
			type: 'focus',
		});
	};

	const send = (message: string) => {
		worker.postMessage({ type: 'send', payload: { message } });
	};

	const listen = (callback: (message: string) => void) => {
		const listener = (e) => {
			if (e.data.type === 'message') {
				callback(e.data.payload);
			}
		};
		worker.addEventListener('message', listener);
		return () => {
			worker.removeEventListener('message', listener);
		};
	};

	useEffect(() => {
		window.addEventListener('focus', focus);
	}, []);

	return { listen, send, connect };
};

export const SocketProvider: FC<PropsWithChildren> = ({ children }) => {
	return (
		<SocketContext.Provider value={useCreateSocket()}>
			{children}
		</SocketContext.Provider>
	);
};

export const useServerSocket = () => useContext(SocketContext)!;
