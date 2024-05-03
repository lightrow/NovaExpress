import { FC, memo } from 'react';
import { AppStore, useGlobalStore } from '../store';

export let Store: AppStore;

export const RCTExposer: FC = memo(() => {
	const store = useGlobalStore();

	Store = store;

	return null;
});
