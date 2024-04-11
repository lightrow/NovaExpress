import { FC } from 'react';
import { AppStore, useGlobalStore } from '../store';

export let Store: AppStore;

export const RCTExposer: FC = () => {
	const store = useGlobalStore();

	Store = store;

	return null;
};
