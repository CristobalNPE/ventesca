import { ProfitLineCharts } from '#app/components/analytics/profit-charts.tsx'
import { TopSellerCard } from '#app/components/analytics/top-seller-card.tsx'
import { TopSellingProductsBarChart } from '#app/components/analytics/top-selling-products-chart.tsx'
import { TotalOrders } from '#app/components/analytics/total-orders-card.js'
import { TotalProfit } from '#app/components/analytics/total-profit-card.tsx'
import { WeeklyTransactionsLineChart } from '#app/components/analytics/weekly-transactions-chart.tsx'
import { ContentLayout } from '#app/components/layout/content-layout.tsx'
import { AnalyticsProvider } from '#app/context/analytics/AnalyticsContext.tsx'
import {
	getCompletedOrdersCount,
	getDailyProfitsForWeek,
	getDailyTransactionsForWeek,
	getTopSellerStatsForWeek,
	getTopSellingProducts,
	getTotalProfits,
	getWeeklyProfitsForMonth,
} from '#app/services/analytics/analytics-service.server.ts'
import { getBusinessId } from '#app/utils/auth.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const [
		numberOfCompletedOrders,
		totalProfits,
		dailyProfits,
		weeklyProfits,
		topSellingProducts,
		sellerStatsForWeek,
		dailyTransactionsForWeek,
	] = await Promise.all([
		getCompletedOrdersCount(businessId),
		getTotalProfits(businessId),
		getDailyProfitsForWeek({ businessId }),
		getWeeklyProfitsForMonth({ businessId }),
		getTopSellingProducts(businessId),
		getTopSellerStatsForWeek({ businessId }),
		getDailyTransactionsForWeek({ businessId }),
	])


	return json({
		numberOfCompletedOrders,
		totalProfits,
		dailyProfits,
		weeklyProfits,
		topSellingProducts,
		sellerStatsForWeek,
		dailyTransactionsForWeek,
	})
}
export default function Dashboard() {
	const loaderData = useLoaderData<typeof loader>()
	return (
		<AnalyticsProvider data={loaderData}>
			<ContentLayout title="Analíticas de la Empresa">
				<main className="grid gap-6  xl:grid-cols-7 ">
					<div className="grid gap-y-6 xl:col-span-5 xl:grid-cols-5  xl:gap-x-6 ">
						<div className="grid gap-4 xl:col-span-2 ">
							<TotalProfit />
							<TotalOrders />
							<ProfitLineCharts />
						</div>
						<div className="grid gap-6 xl:col-span-3 ">
							<WeeklyTransactionsLineChart />
							<TopSellerCard />
						</div>
					</div>
					<div className="grid gap-6 xl:col-span-2">
						<TopSellingProductsBarChart />
					</div>
				</main>
			</ContentLayout>
		</AnalyticsProvider>
	)
}
