import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '#app/components/ui/chart.tsx'
import { Icon } from '#app/components/ui/icon.tsx'


const weeklyChartConfig = {
	totalSales: {
		label: 'Ventas',
		color: 'hsl(var(--chart-2))',
		
	},
	totalReturns: {
		label: 'Devoluciones',
		color: 'hsl(var(--chart-5))',
	},
} satisfies ChartConfig
export function ChartsCard({
	currentWeekSales,
}: {
	currentWeekSales: {
		day: string
		date: string
		totalSales: number
		totalReturns: number
	}[]
}) {
	//check if the currentWeekSales has valid data in order to display it or not
	const hasValidData = currentWeekSales.some(
		product => product.totalSales > 0 || product.totalReturns > 0,
	)
	return (
		<Card className="flex h-full w-full flex-1 flex-col">
			<CardHeader>
				<CardTitle>Ventas esta semana</CardTitle>
				{currentWeekSales.length ? (
					<CardDescription>
						Período {currentWeekSales[0]?.date} -{' '}
						{currentWeekSales[currentWeekSales.length - 1]?.date}
					</CardDescription>
				) : null}
			</CardHeader>

			<CardContent className="flex flex-1 flex-col items-center justify-center">
				{hasValidData ? (
					<WeekSalesChart chartData={currentWeekSales} />
				) : (
					<div className="grid h-full  w-full place-content-center rounded-md border border-dashed border-secondary text-center shadow-sm">
						<div className="flex flex-col items-center gap-2">
							<Icon name="exclamation-circle" size="xl" />
							<span className="text-muted-foreground">
								Aún no existen datos de venta.
							</span>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

function WeekSalesChart({
	chartData,
}: {
	chartData: { day: string; totalSales: number; totalReturns: number }[]
}) {
	return (
		<ChartContainer className="h-full w-full" config={weeklyChartConfig}>
			<BarChart accessibilityLayer data={chartData}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="day"
					tickLine={false}
					tickMargin={10}
					axisLine={false}
					tickFormatter={value => value.slice(0, 3)}
				/>
				<ChartTooltip
					cursor={false}
					content={<ChartTooltipContent indicator="dashed" />}
				/>
				<Bar dataKey="totalSales" fill="var(--color-totalSales)" radius={4} />
				<Bar
					dataKey="totalReturns"
					fill="var(--color-totalReturns)"
					radius={4}
				/>
			</BarChart>
		</ChartContainer>
	)
}
