const timeStringToDate = (timeString: string, now: Date) => {
	const [hours, minutes] = timeString.split(':');
	const date = new Date(now);
	date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
	return date;
};

export const isDateBetweenTimes = (
	date: Date,
	startTime: string,
	endTime: string
) => {
	const startDate = timeStringToDate(startTime, date);
	const endDate = timeStringToDate(endTime, date);

	// If interval is e.g. 23:00 - 01:00, then we need to add a day to the end date
	if (startDate.getTime() >= endDate.getTime()) {
		endDate.setDate(endDate.getDate() + 1);
	}

	// Need to compare with tomorrows date if interval is e.g. 23:00 - 01:00 and date is 00:30
	// Otherwise the comparison would only be; is today 00:30 between today 23:00 and tomorrow 01:00
	const dateTomorrow = new Date(date);
	dateTomorrow.setDate(date.getDate() + 1);

	return (
		(date.getTime() >= startDate.getTime() &&
			date.getTime() <= endDate.getTime()) ||
		(dateTomorrow.getTime() >= startDate.getTime() &&
			dateTomorrow.getTime() <= endDate.getTime())
	);
};
