import { FC, memo, useCallback, useEffect, useState } from 'react';
import { Dialog } from './Dialog/Dialog';
import { BusEventEnum, EventBus } from '../../utils/eventBus';

export interface DialogData {
	text: string;
	actions: { fn?: () => Promise<void>; label: string }[];
}

export const Dialogs: FC = memo(() => {
	const [dialogs, setDialogs] = useState<DialogData[]>([]);

	useEffect(() => {
		EventBus.send({
			key: BusEventEnum.DIALOG,
			data: {
				text: 'Confirm',
				actions: [{ label: 'Aight', fn: () => {} }, { label: 'Nah' }],
			},
		});
		EventBus.on<DialogData>(BusEventEnum.DIALOG, (event) => {
			setDialogs((dialogs) => {
				return [...dialogs, event.data];
			});
		});
	}, []);

	const handleClose = useCallback(
		(data: DialogData) => () => {
			setDialogs((dialogs) => {
				const newDialogs = dialogs.filter((d) => d.text !== data.text);
				return newDialogs;
			});
		},
		[]
	);

	return (
		<>
			{dialogs.map((data) => (
				<Dialog key={data.text} data={data} onClose={handleClose(data)} />
			))}
		</>
	);
});
