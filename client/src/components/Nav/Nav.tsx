import classNames from 'classnames';
import { FC, memo, useCallback } from 'react';
import { FaBell, FaComment, FaEye, FaEyeSlash, FaMapPin, FaMoon } from 'react-icons/fa';
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
	const alwaysShowInsights = useGlobalStore((s) => s.alwaysShowInsights);
	const toggleIsAway = useGlobalStore((s) => s.toggleIsAway);
	const toggleAlwaysShowInsights = useGlobalStore(
		(s) => s.toggleAlwaysShowInsights
	);
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

	const handleInsightsClick = () => {
		toggleAlwaysShowInsights();
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
				<button className={styles.routeButton} onClick={handleInsightsClick}>
					{alwaysShowInsights ? (
						<FaEye color='var(--color-text)' />
					) : (
						<FaEyeSlash color='var(--color-text-faint)' />
					)}
				</button>
				<button className={styles.routeButton} onClick={handleIsAwayClick}>
					{isAway ? (
						<FaMoon color='var(--color-text)' />
					) : (
						<FaBell color='var(--color-text-faint)' />
					)}
				</button>
			</div>
		</div>
	);
});
