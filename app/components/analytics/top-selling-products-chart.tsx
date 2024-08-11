import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '#app/components/ui/chart.tsx'
import { useAnalytics } from '#app/context/analytics/AnalyticsContext.tsx'
import { TrendingUp } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { Icon } from '../ui/icon'
import { Link } from '@remix-run/react'

const barChartData = [
	{ month: 'January', desktop: 900, mobile: 80 },
	{ month: 'February', desktop: 850, mobile: 200 },
	{ month: 'March', desktop: 700, mobile: 120 },
	{ month: 'April', desktop: 600, mobile: 190 },
	{ month: 'May', desktop: 500, mobile: 130 },
	{ month: 'June', desktop: 400, mobile: 140 },
	{ month: 'July', desktop: 350, mobile: 120 },
	{ month: 'August', desktop: 300, mobile: 190 },
	{ month: 'September', desktop: 250, mobile: 130 },
	{ month: 'June', desktop: 214, mobile: 140 },
]

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

export function TopSellingProductsBarChart() {
	const { topSellingProducts } = useAnalytics()

	return (
		<Card className="flex flex-col ">
			<CardHeader>
				<CardTitle>Top productos más vendidos</CardTitle>
				<CardDescription>
					Mostrando los 10 productos más vendidos
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
							tickFormatter={value => value.slice(0, 3)}
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
					<Link
						prefetch="intent"
						unstable_viewTransition
						className="flex items-center gap-3"
						to={`/inventory/${topSellingProducts[0]!.id}`}
					>
						<Icon name="trophy" size="lg" />
						<div>{topSellingProducts[0]!.name}</div>
					</Link>
					<div className="text-sm text-muted-foreground">Mas vendido</div>
				</div>
			</CardFooter>
		</Card>
	)
}
