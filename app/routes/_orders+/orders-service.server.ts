import { prisma } from '#app/utils/db.server.ts'
import { type Order } from '@prisma/client'
import {
	eachDayOfInterval,
	endOfDay,
	endOfToday,
	endOfWeek,
	endOfYesterday,
	format,
	startOfDay,
	startOfToday,
	startOfWeek,
	startOfYesterday,
	subWeeks,
} from 'date-fns'
import { es } from 'date-fns/locale'

import { OrderStatus } from '../../types/orders/order-status.ts'

export async function getLastTwoWeeksEarnings(businessId: string) {
	const currentWeekStartDate = startOfWeek(new Date(), { weekStartsOn: 1 })
	const currentWeekEndDate = endOfWeek(new Date(), { weekStartsOn: 1 })

	const previousWeekDate = subWeeks(new Date(), 1)
	const previousWeekStartDate = startOfWeek(previousWeekDate, {
		weekStartsOn: 1,
	})
	const previousWeekEndDate = endOfWeek(previousWeekDate, { weekStartsOn: 1 })

	const thisWeekOrders = await prisma.order.findMany({
		where: {
			businessId,
			completedAt: { gte: currentWeekStartDate, lte: currentWeekEndDate },
		},
		select: { status: true, total: true },
	})
	const previousWeekOrders = await prisma.order.findMany({
		where: {
			businessId,
			completedAt: { gte: previousWeekStartDate, lte: previousWeekEndDate },
		},
		select: { status: true, total: true },
	})

	const thisWeekEarnings = calculateTotalEarnings(thisWeekOrders)
	const previousWeekEarnings = calculateTotalEarnings(previousWeekOrders)

	return {
		thisWeekEarnings,
		previousWeekEarnings,
		isIncrease: thisWeekEarnings > previousWeekEarnings,
		percentageDifference: calculateEarningsComparison(
			thisWeekEarnings,
			previousWeekEarnings,
		),
	}
}

export async function getWeeklyDailyEarnings(businessId: string) {
	const weekDays = eachDayOfInterval({
		start: startOfWeek(new Date(), { weekStartsOn: 1 }),
		end: endOfWeek(new Date(), { weekStartsOn: 1 }),
	})

	const dailyEarnings = await Promise.all(
		weekDays.map(async day => {
			const orders = await prisma.order.findMany({
				where: {
					businessId,
					//! Should we check for status?
					status: OrderStatus.FINISHED,
					completedAt: { gte: startOfDay(day), lte: endOfDay(day) },
				},
				select: { status: true, total: true },
			})
			const earnings = calculateTotalEarnings(orders)
			return {
				day: format(day, 'eeee', {
					locale: es,
				}),
				earnings,
			}
		}),
	)

	return dailyEarnings
}

export async function getLastTwoDaysEarnings(businessId: string) {
	const currentDayStartDate = startOfToday()
	const currentDayEndDate = endOfToday()
	const previousDayStartDate = startOfYesterday()
	const previousDayEndDate = endOfYesterday()

	const todaysOrders = await prisma.order.findMany({
		where: {
			businessId,
			completedAt: { gte: currentDayStartDate, lte: currentDayEndDate },
		},
		select: { status: true, total: true },
	})
	const yesterdaysOrders = await prisma.order.findMany({
		where: {
			businessId,
			completedAt: { gte: previousDayStartDate, lte: previousDayEndDate },
		},
		select: { status: true, total: true },
	})

	const todaysEarnings = calculateTotalEarnings(todaysOrders)
	const yesterdaysEarnings = calculateTotalEarnings(yesterdaysOrders)

	return {
		todaysEarnings,
		yesterdaysEarnings,
		isIncrease: todaysEarnings > yesterdaysEarnings,
		percentageDifference: calculateEarningsComparison(
			todaysEarnings,
			yesterdaysEarnings,
		),
	}
}

function calculateEarningsComparison(current: number, previous: number) {
	if (previous === 0) {
		return current === 0 ? 0 : 100
	}

	if (current < previous) {
		return Number(((current * 100) / previous).toFixed())
	} else {
		return Number((((current - previous) / previous) * 100).toFixed())
	}
}

function calculateTotalEarnings(orders: Pick<Order, 'status' | 'total'>[]) {
	const orderTotals = orders
		.filter(order => order.status === OrderStatus.FINISHED)
		.map(order => order.total)

	if (orderTotals.length > 0) {
		return orderTotals.reduce((acc, orderTotal) => acc + orderTotal, 0)
	}
	return 0
}
