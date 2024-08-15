import { format, getWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'
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
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '#app/components/ui/tabs.tsx'
import { useAnalytics } from '#app/context/analytics/AnalyticsContext.tsx'
import { formatCurrency } from '#app/utils/misc.tsx'

const chartConfig = {
	profit: {
		label: 'Ganancias',
		color: 'hsl(var(--chart-1))',
	},
} satisfies ChartConfig

export function ProfitLineCharts() {
	return (
		<Card className="">
			<CardHeader className=" p-6 pb-4 ">
				<CardTitle>Ganancias</CardTitle>
			</CardHeader>
			<Tabs defaultValue="week" className="w-full px-4 ">
				<TabsList className="w-full">
					<TabsTrigger className="w-full" value="week">
						Esta semana
					</TabsTrigger>
					<TabsTrigger className="w-full" value="month">
						Este mes
					</TabsTrigger>
				</TabsList>
				<TabsContent value="week">
					<ProfitByWeekChart />
				</TabsContent>
				<TabsContent value="month">
					<ProfitByMonthChart />
				</TabsContent>
			</Tabs>
		</Card>
	)
}

function ProfitByWeekChart() {
	const { dailyProfits } = useAnalytics()

	const formattedDailyProfits = dailyProfits.map(profit => ({
		...profit,
		day: format(profit.day, 'EEEE', { locale: es }),
	}))

	return (
		<>
			<CardHeader className=" py-4 pb-4 pt-2">
				<CardDescription className="text-center">
					Semana del{' '}
					<span className="font-semibold text-foreground">
						{format(dailyProfits[0]?.day!, 'dd-MM-yyyy', { locale: es })}
					</span>{' '}
					al{' '}
					<span className="font-semibold text-foreground">
						{format(dailyProfits[dailyProfits.length - 1]?.day!, 'dd-MM-yyyy', {
							locale: es,
						})}
					</span>
				</CardDescription>
			</CardHeader>
			<CardContent className="py-6">
				<ChartContainer config={chartConfig}>
					<LineChart
						accessibilityLayer
						data={formattedDailyProfits}
						margin={{
							left: 12,
							right: 12,
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="day"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={value => value.slice(0, 3)}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									hideLabel
									labelKey="day"
									className="w-[180px]"
									formatter={(value, name, item, index) => {
										console.log(
											`value: ${value}, name: ${name}, item: ${item}, index: ${index}`,
										)
										return (
											<>
												<div
													className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-[--color-bg]"
													style={
														{
															'--color-bg': `var(--color-${name})`,
														} as React.CSSProperties
													}
												/>
												{chartConfig[name as keyof typeof chartConfig]?.label ||
													name}
												<div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
													{formatCurrency(Number(value))}
												</div>
											</>
										)
									}}
								/>
							}
							cursor={false}
							defaultIndex={1}
						/>
						<Line
							dataKey="profit"
							type="linear"
							stroke="var(--color-profit)"
							strokeWidth={2}
							dot={false}
						/>
					</LineChart>
				</ChartContainer>
			</CardContent>
			<CardFooter className="flex-col items-start gap-2 text-sm"></CardFooter>
		</>
	)
}
function ProfitByMonthChart() {
	const { weeklyProfits } = useAnalytics()

	const formattedWeeklyProfits = weeklyProfits.profits.map((profit, i) => ({
		profit: profit.weekProfit,
		week: `S${i + 1}`,
	}))

	return (
		<>
			<CardHeader className=" py-4 pb-4 pt-2">
				<CardDescription className="text-center">
					Mes de {weeklyProfits.month}. Semana actual:{' '}
					<span className="font-semibold text-foreground">
						S
						{getWeek(new Date(), { weekStartsOn: 1 }) -
							getWeek(
								new Date(new Date().getFullYear(), new Date().getMonth(), 1),
								{ weekStartsOn: 1 },
							) +
							1}
					</span>
				</CardDescription>
			</CardHeader>
			<CardContent className="py-6">
				<ChartContainer config={chartConfig}>
					<LineChart
						accessibilityLayer
						data={formattedWeeklyProfits}
						margin={{
							left: 12,
							right: 12,
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="week"
							tickLine={false}
							axisLine={false}
							tickMargin={12}
							tickFormatter={value => value}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									hideLabel
									className="w-[180px]"
									formatter={(value, name, item, index) => {
										console.log(
											`value: ${value}, name: ${name}, item: ${item}, index: ${index}`,
										)
										return (
											<>
												<div
													className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-[--color-bg]"
													style={
														{
															'--color-bg': `var(--color-${name})`,
														} as React.CSSProperties
													}
												/>
												{chartConfig[name as keyof typeof chartConfig]?.label ||
													name}
												<div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
													{formatCurrency(Number(value))}
												</div>
											</>
										)
									}}
								/>
							}
							cursor={false}
							defaultIndex={1}
						/>
						<Line
							dataKey="profit"
							type="linear"
							stroke="var(--color-profit)"
							strokeWidth={2}
							dot={false}
						/>
					</LineChart>
				</ChartContainer>
			</CardContent>
			<CardFooter className="flex-col items-start gap-2 text-sm"></CardFooter>
		</>
	)
}
