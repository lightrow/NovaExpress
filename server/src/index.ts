import express from 'express';
import http from 'http';
import ws from 'ws';
import { AutoMessageService } from './services/auto-message/auto-message.service';
import { SocketServerService } from './services/socket-server/socket.server.service';
import './services/command/command.service';

const app = express();
const server = http.createServer(app);
const wss = new ws.Server({ server });

AutoMessageService.setup();

app.use(express.json());

app.use(express.static('../dist'));

wss.on('connection', function connection(client) {
	SocketServerService.onClientConnect(client);

	client.on('close', () => {
		SocketServerService.onClose(client);
	});

	client.on('message', async (rawPayload) => {
		SocketServerService.onMessage(rawPayload);
	});
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT);
