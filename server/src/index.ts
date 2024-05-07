import express from 'express';
import http from 'http';
import ws from 'ws';
import './services/patience/patience.service';
import './services/command/command.service';
import { SocketServerService } from './services/socket-server/socket.server.service';
import { ChatManagerService } from './services/chat-manager/chat-manager.service';
import cors from 'cors';

const app = express();
const server = http.createServer(app);
const wss = new ws.Server({ server });

app.use(cors());
app.use(express.json());
app.use(express.static('../dist'));
app.use('/data', express.static('./data'));

app.get('/chats', (_, res) => {
	const summary = ChatManagerService.getChatsSummary();
	return res.json(summary);
});

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
