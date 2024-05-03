import classNames from 'classnames';
import { FC, memo, useCallback } from 'react';
import { FaBroom, FaComment, FaMapPin } from 'react-icons/fa';
import { FaBroomBall, FaGear, FaRegRectangleList } from 'react-icons/fa6';
import { Route, useGlobalStore } from '../store';
import styles from './Nav.module.css';
import { useServerSocket } from '../socket';
import { SocketEventEnum } from '../../../../types';
import { BusEventEnum, EventBus } from '../../utils/eventBus';

export const Nav: FC = memo(() => {
	const currentRoute = useGlobalStore((s) => s.route);
	const setRoute = useGlobalStore((s) => s.setRoute);
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
				<button className={styles.routeButton} onClick={purge}>
					<FaBroomBall />
				</button>
			</div>
		</div>
	);
});
