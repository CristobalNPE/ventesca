import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '#app/components/ui/chart.tsx'
import { useAnalytics } from '#app/context/analytics/AnalyticsContext.tsx'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { Icon } from '../ui/icon'
import { LinkWithOrigin } from '../ui/link-origin'
import { useSupplier } from '#app/context/suppliers/SupplierContext.js'

const barChartConfig = {
	totalSales: {
		label: 'Unidades vendidas',
		color: 'hsl(var(--chart-1))',
	},
	mobile: {
		label: 'Mobile',
		color: 'hsl(var(--chart-2))',
	},
	label: {
		color: 'hsl(var(--background))',
	},
} satisfies ChartConfig

export function TopSupplierProductsChart() {
	const { topSellingProducts } = useSupplier()
	if (topSellingProducts.length <= 0) {
		return null
	}

	return (
		<Card className="flex flex-col ">
			<CardHeader>
				<CardTitle>Top productos</CardTitle>
				<CardDescription>
					Mostrando los 5 productos más vendidos del proveedor.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex-1 ">
				<ChartContainer config={barChartConfig} className="h-full w-full">
					<BarChart
						accessibilityLayer
						data={topSellingProducts}
						layout="vertical"
						margin={{
							right: 50,
						}}
					>
						<CartesianGrid horizontal={false} />
						<YAxis
							dataKey="name"
							type="category"
							tickLine={false}
							tickMargin={10}
							axisLine={false}
							tickFormatter={(value) => value.slice(0, 3)}
							hide
						/>
						<XAxis dataKey="totalSales" type="number" hide />
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent indicator="line" />}
						/>
						<Bar
							dataKey="totalSales"
							layout="vertical"
							fill="var(--color-totalSales)"
							radius={4}
						>
							<LabelList
								dataKey="totalSales"
								position="right"
								offset={8}
								className="fill-foreground"
								fontSize={12}
							/>
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
			<CardFooter className="flex-col items-start gap-2 text-sm ">
				<div className="flex w-full flex-col items-center justify-center gap-2 rounded-sm  p-2 text-lg leading-none text-foreground">
					<LinkWithOrigin
						prefetch="intent"
						unstable_viewTransition
						className="flex items-center justify-center gap-3"
						to={`/inventory/${topSellingProducts[0]!.id}`}
					>
						<Icon name="trophy" size="lg" />
						<div>{topSellingProducts[0]!.name}</div>
					</LinkWithOrigin>
					<div className="text-sm text-muted-foreground">Mas vendido</div>
				</div>
			</CardFooter>
		</Card>
	)
}
