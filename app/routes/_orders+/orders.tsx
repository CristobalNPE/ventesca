import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { Prisma } from '@prisma/client'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { MetaFunction, useLoaderData } from '@remix-run/react'

import { OrdersHeader } from '#app/components/orders/orders-header.tsx'
import { OrdersReportsTable } from '#app/components/orders/orders-reports-table.tsx'
import { OrdersStats } from '#app/components/orders/orders-stats.tsx'
import { FILTER_PARAMS } from '#app/constants/filterParams.ts'
import { OrdersProvider } from '#app/context/orders/OrdersContext.tsx'
import { SortDirection } from '#app/types/SortDirection.ts'
import { getTimePeriodBoundaries } from '#app/utils/time-periods.ts'
import {
	getLastTwoDaysEarnings,
	getLastTwoWeeksEarnings,
	getWeeklyDailyEarnings,
} from './orders-service.server'
import { ContentLayout } from '#app/components/layout/content-layout.tsx'
import { VerifyOrderDialog } from './orders_.verify-order'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const url = new URL(request.url)
	const $top = Number(url.searchParams.get('$top')) || 20
	const $skip = Number(url.searchParams.get('$skip')) || 0

	const periodFilter = url.searchParams
		.get(FILTER_PARAMS.TIME_PERIOD)
		?.toLowerCase()
	const statusFilter = url.searchParams.get(FILTER_PARAMS.STATUS)
	const sellerFilter = url.searchParams.get(FILTER_PARAMS.SELLER)
	const sortBy = url.searchParams.get(FILTER_PARAMS.SORT_BY)
	const sortDirection = url.searchParams.get(FILTER_PARAMS.SORT_DIRECTION)

	const sortOptions: Record<string, Prisma.OrderOrderByWithRelationInput> = {
		default: { completedAt: 'desc' },
		status: { status: sortDirection === SortDirection.ASC ? 'asc' : 'desc' },
		'completed-at': {
			completedAt: sortDirection === SortDirection.ASC ? 'asc' : 'desc',
		},
		total: { total: sortDirection === SortDirection.ASC ? 'asc' : 'desc' },
		seller: {
			seller: { name: sortDirection === SortDirection.ASC ? 'asc' : 'desc' },
		},
	}

	const { startDate, endDate } = getTimePeriodBoundaries(periodFilter)

	const filters: Prisma.OrderWhereInput = {
		businessId,
		...(startDate &&
			endDate && { completedAt: { gte: startDate, lte: endDate } }),
		...(statusFilter && { status: statusFilter }),
		...(sellerFilter && { sellerId: sellerFilter }),
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
		orderBy:
			sortBy && sortOptions[sortBy]
				? sortOptions[sortBy]
				: sortOptions['default'],
	})

	const businessSellersPromise = prisma.user.findMany({
		where: { businessId, isDeleted: false },
		select: { id: true, name: true, username: true },
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

	return (
		<OrdersProvider data={loaderData}>
			<ContentLayout title='Reportes de Transacción' limitHeight actions={<VerifyOrderDialog />} >
				<main className="flex h-full flex-col gap-4">
					{/* <OrdersHeader /> */}
					<div className="flex w-full flex-1 flex-col gap-4  xl:h-[48rem] xl:flex-row">
						<div className="flex h-full w-full flex-1 flex-col-reverse gap-4  xl:flex-row-reverse ">
							<OrdersStats />
							<OrdersReportsTable />
						</div>
					</div>
				</main>
			</ContentLayout>
		</OrdersProvider>
	)
}

export const meta: MetaFunction = () => {
	return [{ title: 'Reportes de transacción | Ventesca' }]
}
