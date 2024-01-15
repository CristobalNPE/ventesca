import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '#app/components/ui/alert.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { TRANSACTION_STATUS_COMPLETED } from './sell.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	//Count items with 0 stock
	const itemsWithZeroStock = await prisma.item.count({
		where: {
			stock: 0,
		},
	})

	const now = new Date()
	const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

	const startOfWeek = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate() - now.getDay(),
	)
	console.log(startOfWeek)

	const endOfWeek = new Date(
		startOfWeek.getFullYear(),
		startOfWeek.getMonth(),
		startOfWeek.getDate() + 7,
	)
	console.log(endOfWeek)

	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
	const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)

	console.log(startOfDay)
	console.log(startOfWeek)
	console.log(endOfWeek)
	console.log(startOfMonth)
	console.log(endOfMonth)

	const dailyEarnings = await prisma.transaction.groupBy({
		by: ['completedAt'],
		where: {
			status: TRANSACTION_STATUS_COMPLETED,
			completedAt: {
				gte: startOfDay,
				lt: new Date(),
			},
		},
		_sum: {
			total: true,
		},
	})

	const weeklyEarnings = await prisma.transaction.groupBy({
		by: ['completedAt'],
		where: {
			status: TRANSACTION_STATUS_COMPLETED,
			completedAt: {
				gte: startOfWeek,
				lt: endOfWeek,
			},
		},
		_sum: {
			total: true,
		},
	})

	const monthlyEarnings = await prisma.transaction.groupBy({
		by: ['completedAt'],
		where: {
			status: TRANSACTION_STATUS_COMPLETED,
			completedAt: {
				gte: startOfMonth,
				lt: endOfMonth,
			},
		},
		_sum: {
			total: true,
		},
	})
	return json({
		itemsWithZeroStock,
		dailyEarnings,
		weeklyEarnings,
		monthlyEarnings,
	})
}

export default function ControlCenter() {
	const isAdmin = true

	const { itemsWithZeroStock, dailyEarnings, weeklyEarnings, monthlyEarnings } =
		useLoaderData<typeof loader>()

	// sum total of all finished transactions

	const totalDailyEarnings = dailyEarnings.reduce(
		(acc, curr) => acc + curr._sum.total!,
		0,
	)
	const totalWeeklyEarnings = weeklyEarnings.reduce(
		(acc, curr) => acc + curr._sum.total!,
		0,
	)
	const totalMonthlyEarnings = monthlyEarnings.reduce(
		(acc, curr) => acc + curr._sum.total!,
		0,
	)
	console.log(totalDailyEarnings)
	console.log(totalWeeklyEarnings)
	console.log(totalMonthlyEarnings)

	return (
		<>
			<h1 className="text-2xl">Centro de Control</h1>

			<Alert variant="destructive">
				<Icon name="exclamation-circle" size="xl" />
				<AlertTitle>Sin Stock</AlertTitle>
				<AlertDescription>
					{itemsWithZeroStock} artículos no tienen stock y necesitan revision.
				</AlertDescription>
			</Alert>
			<Alert>
				<Icon name="exclamation-circle" size="xl" />
				<AlertTitle>Ingresos</AlertTitle>
				<AlertDescription></AlertDescription>
			</Alert>
		</>
	)
}
