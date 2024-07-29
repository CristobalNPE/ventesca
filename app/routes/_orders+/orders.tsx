import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { userIsAdmin } from '#app/utils/user.ts'
import { Prisma } from '@prisma/client'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { MetaFunction, useLoaderData } from '@remix-run/react'

import { OrdersHeader } from '#app/components/orders/orders-header.tsx'
import { OrdersReportsTable } from '#app/components/orders/orders-reports-table.tsx'
import { OrdersStats } from '#app/components/orders/orders-stats.tsx'
import { OrdersProvider } from '#app/context/orders/OrdersContext.tsx'
import { getTimePeriodBoundaries } from '#app/utils/time-periods.ts'
import {
	getLastTwoDaysEarnings,
	getLastTwoWeeksEarnings,
	getWeeklyDailyEarnings,
} from './orders-service.server'

export const statusParam = 'status'
export const periodParam = 'period'
export const sellerParam = 'seller'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)
	const url = new URL(request.url)
	const $top = Number(url.searchParams.get('$top')) || 50
	const $skip = Number(url.searchParams.get('$skip')) || 0
	const periodFilter = url.searchParams.get(periodParam)?.toLowerCase()
	const statusFilter = url.searchParams.get(statusParam)
	const sellerFilter = url.searchParams.get(sellerParam)

	const { startDate, endDate } = getTimePeriodBoundaries(periodFilter)

	const { roles: userRoles } = await prisma.user.findFirstOrThrow({
		where: { id: userId },
		select: { roles: true },
	})

	const isAdmin = userRoles.map(role => role.name).includes('Administrador')

	const filters: Prisma.OrderWhereInput = {
		businessId,
		...(startDate &&
			endDate && { completedAt: { gte: startDate, lte: endDate } }),
		...(statusFilter && { status: statusFilter }),
		...(sellerFilter && { sellerId: sellerFilter }),
		...(!isAdmin && { sellerId: userId }),
	}

	const weekEarningsPromise = getLastTwoWeeksEarnings(businessId)

	const dayEarningsPromise = getLastTwoDaysEarnings(businessId)

	const weekDailyEarningsPromise = getWeeklyDailyEarnings(businessId)

	const numberOfOrdersPromise = prisma.order.count({
		where: filters,
	})

	const ordersPromise = prisma.order.findMany({
		take: $top,
		skip: $skip,
		select: {
			id: true,
			createdAt: true,
			completedAt: true,
			status: true,
			total: true,
			seller: { select: { name: true } },
		},
		where: filters,
		orderBy: { completedAt: 'desc' },
	})

	const businessSellersPromise = prisma.user.findMany({
		where: { businessId, isDeleted: false },
		select: { id: true, name: true },
	})

	const [
		numberOfOrders,
		orders,
		businessSellers,
		weekEarnings,
		dayEarnings,
		weekDailyEarnings,
	] = await Promise.all([
		numberOfOrdersPromise,
		ordersPromise,
		businessSellersPromise,
		weekEarningsPromise,
		dayEarningsPromise,
		weekDailyEarningsPromise,
	])

	return json({
		orders,
		numberOfOrders,
		businessSellers,
		weekEarnings,
		dayEarnings,
		weekDailyEarnings,
	})
}

export default function OrderReportsRoute() {
	const loaderData = useLoaderData<typeof loader>()
	const isAdmin = userIsAdmin()

	return (
		<OrdersProvider data={loaderData}>
			<main className="flex h-full flex-col gap-4">
				<OrdersHeader />
				<div className="flex w-full flex-1 flex-col gap-4  lg:h-[48rem] lg:flex-row">
					<div className="flex h-full w-full flex-1 flex-col gap-4  md:flex-row-reverse ">
						<OrdersStats />
						<OrdersReportsTable />
					</div>
				</div>
			</main>
		</OrdersProvider>
	)
}

export const meta: MetaFunction = () => {
	return [{ title: 'Reportes de transacción | Ventesca' }]
}
