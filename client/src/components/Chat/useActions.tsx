import {
	FC,
	PropsWithChildren,
	createContext,
	useCallback,
	useContext,
	useRef,
	useState,
} from 'react';
import { ChatMessage, SocketEventEnum } from '../../../../types';
import useUpdatedRef from '../../hooks/useUpdatedRef';
import { useServerSocket } from '../socket';
import { useGlobalStore } from '../store';
import { createNewMessage } from '../../lib/createNewMessage';

export const ActionsProvider: FC<PropsWithChildren> = ({ children }) => {
	const actions = useCreateActions();
	return (
		<ActionsContext.Provider value={actions}>
			{children}
		</ActionsContext.Provider>
	);
};

export const useActions = () => useContext(ActionsContext)!;

const ActionsContext = createContext<ReturnType<typeof useCreateActions>>(null);

const useCreateActions = () => {
	const [isActive, setIsActive] = useState(false);
	const [shallContinue, setShallContinue] = useState(false);
	const [shallReply, setShallReply] = useState(true);
	const [persona, setPersona] = useState<ChatMessage['persona']>('user');
	const [inputValue, setInput] = useState('');

	const textAreaRef = useRef<HTMLTextAreaElement>(null);
	const socket = useServerSocket();
	const setIsInferring = useGlobalStore((s) => s.setIsInferring);
	const setSpecial = useGlobalStore((s) => s.toggleSpecialMode);
	const isSpecial = useGlobalStore((s) => s.isSpecialMode);
	const inputValueRef = useUpdatedRef(inputValue);
	const toggleIsSending = useGlobalStore((s) => s.toggleIsSending);

	// 1. submit and reply
	// 2. submit and continue
	// 3. submit and do nothing
	// 4. continue last
	// 5. reroll

	const _submit = useCallback(() => {
		if (shallReply) {
			submitAndReply(persona);
		} else if (shallContinue) {
			submitAndContinue(persona);
		} else {
			submitAndDoNothing(persona);
		}
		setInput('');
		setIsActive(false);
	}, [persona, shallContinue, shallReply]);

	const _submitRef = useUpdatedRef(_submit);

	const submit: typeof _submit = (...args) => _submitRef.current(...args);

	const submitAndReply = (persona: ChatMessage['persona']) => {
		const message = {
			type: SocketEventEnum.ADD_MESSAGE_AND_REPLY,
			message: createNewMessage(persona, inputValueRef.current || '...'),
		};
		setIsInferring(true);
		socket.send(JSON.stringify(message));
		toggleIsSending(true);
	};

	const submitAndContinue = (persona: ChatMessage['persona']) => {
		const message = {
			type: SocketEventEnum.ADD_MESSAGE_AND_CONTINUE,
			message: createNewMessage(persona, inputValueRef.current || ''),
		};
		setIsInferring(true);
		socket.send(JSON.stringify(message));
		toggleIsSending(true);
	};

	const submitAndDoNothing = (persona: ChatMessage['persona']) => {
		const message = {
			type: SocketEventEnum.ADD_MESSAGE_NO_REPLY,
			message: createNewMessage(persona, inputValueRef.current || '...'),
		};
		socket.send(JSON.stringify(message));
		toggleIsSending(true);
	};

	const continueFromLast = () => {
		socket.send(JSON.stringify({ type: SocketEventEnum.CONTINUE }));
		setIsInferring(true);
	};

	const retry = () => {
		socket.send(JSON.stringify({ type: SocketEventEnum.RETRY }));
		setIsInferring(true);
	};

	const stop = () => {
		socket.send(JSON.stringify({ type: SocketEventEnum.STOP }));
	};

	const toggleSpecial = () => {
		socket.send(
			JSON.stringify({
				type: SocketEventEnum.TOGGLE_SPECIAL,
				value: !isSpecial,
			})
		);
		setSpecial(!isSpecial);
	};

	return {
		toggleSpecial,
		inputValue,
		setInput,
		persona,
		setPersona,
		shallContinue,
		shallReply,
		submitAndContinue,
		setShallContinue,
		setShallReply,
		isActive,
		setIsActive,
		stop,
		retry,
		submit,
		continueFromLast,
		textAreaRef,
	};
};
