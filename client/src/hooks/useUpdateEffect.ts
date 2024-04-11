import { useEffect, useLayoutEffect } from 'react';
import { useFirstRender } from './useFirstRender';

export const useUpdateEffect: typeof useEffect = (effect, deps) => {
	const isFirstMount = useFirstRender();

	useLayoutEffect(() => {
		if (!isFirstMount) {
			return effect();
		}
	}, deps);
};
