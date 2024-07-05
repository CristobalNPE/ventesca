import {
	endOfMonth,
	endOfToday,
	endOfWeek,
	endOfYear,
	isThisMonth,
	isThisWeek,
	isThisYear,
	isToday,
	startOfMonth,
	startOfToday,
	startOfWeek,
	startOfYear,
} from 'date-fns'

/**
 * Represents different time periods used in the application.
 */
export enum TimePeriod {
	TODAY = 'today',
	LAST_WEEK = 'last-week',
	LAST_MONTH = 'last-month',
	LAST_YEAR = 'last-year',
}

/**
 * Array containing all available time periods.
 */
export const allTimePeriods = [
	TimePeriod.TODAY,
	TimePeriod.LAST_WEEK,
	TimePeriod.LAST_MONTH,
	TimePeriod.LAST_YEAR,
] as const

/**
 * Human-readable names for each time period.
 */
export const timePeriodNames: Record<TimePeriod, string> = {
	[TimePeriod.TODAY]: 'Hoy',
	[TimePeriod.LAST_WEEK]: 'Semana',
	[TimePeriod.LAST_MONTH]: 'Mes',
	[TimePeriod.LAST_YEAR]: 'Año',
}

/**
 * Type guard to check if a value is a valid TimePeriod.
 * @param value - The value to check.
 * @returns True if the value is a valid TimePeriod, false otherwise.
 */
export function isTimePeriod(value: any): value is TimePeriod {
	return Object.values(TimePeriod).includes(value)
}

/**
 * Calculates the date range for a given time period.
 * @period period - The time period to calculate the date range for.
 * @returns An object containing the start and end dates for the given time period.
 * 					If not a valid period, returns the date range for the current day.
 */
export function getTimePeriodBoundaries(
	period: TimePeriod | string | undefined,
) {
	if (!isTimePeriod(period))
		return { startDate: startOfToday(), endDate: endOfToday() }

	switch (period) {
		case TimePeriod.TODAY:
			return { startDate: startOfToday(), endDate: endOfToday() }
		case TimePeriod.LAST_WEEK:
			return {
				startDate: startOfWeek(new Date(), { weekStartsOn: 1 }),
				endDate: endOfWeek(new Date(), { weekStartsOn: 1 }),
			}
		case TimePeriod.LAST_MONTH:
			return {
				startDate: startOfMonth(new Date()),
				endDate: endOfMonth(new Date()),
			}
		case TimePeriod.LAST_YEAR:
			return {
				startDate: startOfYear(new Date()),
				endDate: endOfYear(new Date()),
			}
		default:
			return { startDate: startOfToday(), endDate: endOfToday() }
	}
}
/**
 * Determines the TimePeriod a given date belongs to.
 * @param date - The date to check.
 * @returns The TimePeriod the date belongs to, or undefined if it doesn't fit any valid period.
 */
export function getTimePeriodForDate(date: Date): TimePeriod | undefined {
	if (isToday(date)) {
		return TimePeriod.TODAY
	} else if (isThisWeek(date, { weekStartsOn: 1 })) {
		return TimePeriod.LAST_WEEK
	} else if (isThisMonth(date)) {
		return TimePeriod.LAST_MONTH
	} else if (isThisYear(date)) {
		return TimePeriod.LAST_YEAR
	}

	return undefined
}
