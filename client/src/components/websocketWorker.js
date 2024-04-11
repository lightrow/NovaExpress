let socket = null;
let url;
let queue = [];

const createSocket = (newUrl) => {
	if (newUrl) {
		url = newUrl;
	}
	if (socket && socket.readyState === WebSocket.OPEN) {
		socket.close();
	}
	socket = new WebSocket(url);
	socket.onopen = () => {
		postMessage({ type: 'connected' });
		if (queue.length) {
			queue.forEach((message) => {
				socket.send(message);
			});
			queue = [];
		}
	};
	socket.onmessage = (event) => {
		postMessage({ type: 'message', payload: event.data });
	};
	socket.onclose = () => {
		setTimeout(() => {
			if (
				socket.readyState === WebSocket.CLOSED ||
				socket.readyState === WebSocket.CLOSING
			) {
				createSocket();
			}
		}, 3000);
	};
};

self.onmessage = function (e) {
	const { type, payload } = e.data;

	switch (type) {
		case 'connect':
			createSocket(payload.url);
			break;
		case 'focus':
			if (
				socket.readyState === WebSocket.CLOSED ||
				socket.readyState === WebSocket.CLOSING
			) {
				createSocket();
			}
			break;
		case 'send':
			const { message } = payload;
			if (
				socket.readyState === WebSocket.CLOSED ||
				socket.readyState === WebSocket.CLOSING
			) {
				queue.push(message);
				createSocket();
				return;
			}
			socket.send(message);
			break;
		default:
			break;
	}
};
