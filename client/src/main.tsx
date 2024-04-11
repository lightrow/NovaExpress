import ReactDOM from 'react-dom/client';
import App from './App';
import { SocketProvider } from './components/socket';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
	<SocketProvider>
		<App />
	</SocketProvider>
);
