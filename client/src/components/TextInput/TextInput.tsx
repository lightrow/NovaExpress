import { forwardRef, useEffect, useRef } from 'react';
import { mergeRefs } from 'react-merge-refs';
import './TextInput.css';

export const TextInput = forwardRef((props: any, ref: any) => {
	const ownRef = useRef<HTMLTextAreaElement>(null);

	const recalcHeight = () => {
		const el = ownRef.current!;
		el.style.height = 'auto';
		el.style.height = el.scrollHeight + ((window as any).chrome ? 2 : 0) + 'px';
	};

	const handleChange = (e: any) => {
		props.onChange?.(e);
		if (!props.value) {
			recalcHeight();
		}
	};

	useEffect(() => {
		recalcHeight();
	}, [props.value]);

	return (
		<textarea
			ref={mergeRefs([ref, ownRef])}
			{...props}
			onChange={handleChange}
			className={'textarea ' + (props.className || '')}
		/>
	);
});
