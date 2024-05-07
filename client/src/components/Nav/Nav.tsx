import classNames from 'classnames';
import { FC, memo, useCallback } from 'react';
import { BsMoonStars, BsMoonStarsFill } from 'react-icons/bs';
import { FaComment, FaMapPin } from 'react-icons/fa';
import { FaGear, FaRegRectangleList } from 'react-icons/fa6';
import { SocketEventEnum } from '../../../../types';
import { BusEventEnum, EventBus } from '../../utils/eventBus';
import { useServerSocket } from '../socket';
import { Route, useGlobalStore } from '../store';
import styles from './Nav.module.css';

export const Nav: FC = memo(() => {
	const currentRoute = useGlobalStore((s) => s.route);
	const setRoute = useGlobalStore((s) => s.setRoute);
	const isAway = useGlobalStore((s) => s.isAway);
	const toggleIsAway = useGlobalStore((s) => s.toggleIsAway);
	const socket = useServerSocket();

	const routes = {
		[Route.CHAT]: <FaComment />,
		[Route.CHATS]: <FaRegRectangleList />,
		[Route.PINS]: <FaMapPin />,
		[Route.SETTINGS]: <FaGear />,
	};

	const handleRouteClick = useCallback(
		(route: Route) => () => {
			setRoute(route);
		},
		[]
	);

	const handleIsAwayClick = () => {
		socket.send(
			JSON.stringify({
				type: SocketEventEnum.TOGGLE_AWAY,
				value: !isAway,
			})
		);
		toggleIsAway();
	};

	const purge = () => {
		EventBus.send({
			key: BusEventEnum.DIALOG,
			data: {
				text: 'Are you sure you want to remove all unpinned messages?',
				actions: [
					{ label: 'Nah' },
					{
						label: 'Aight',
						fn: () => {
							socket.send(
								JSON.stringify({
									type: SocketEventEnum.PRUNE,
								})
							);
						},
					},
				],
			},
		});
	};

	return (
		<div className={styles.container}>
			<div className={styles.bar}>
				{Object.entries(routes).map(([route, name]) => {
					return (
						<button
							key={route}
							className={classNames(styles.routeButton, {
								[styles.active]: route === currentRoute,
							})}
							onClick={handleRouteClick(route as Route)}
						>
							{name}
						</button>
					);
				})}
				<div className={styles.separator} />
				<button className={styles.routeButton} onClick={handleIsAwayClick}>
					{isAway ? (
						<BsMoonStarsFill color='var(--color-highlight)' />
					) : (
						<BsMoonStars color='var(--color-text-faint)' />
					)}
				</button>
			</div>
		</div>
	);
});
