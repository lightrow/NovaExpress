import { forwardRef, useRef } from 'react';
import { mergeRefs } from 'react-merge-refs';
import TextareaAutosize from 'react-textarea-autosize';
import './TextInput.css';

export const TextInput = forwardRef((props: any, ref: any) => {
	const ownRef = useRef<HTMLTextAreaElement>(null);

	return (
		<TextareaAutosize
			ref={mergeRefs([ref, ownRef])}
			{...props}
			className={'textarea ' + (props.className || '')}
		/>
	);
});
