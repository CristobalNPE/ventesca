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
import { Icon } from '#app/components/ui/icon.tsx'
import { useAnalytics } from '#app/context/analytics/AnalyticsContext.tsx'
import { capitalize, formatPercentage } from '#app/utils/misc.tsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'

const line2ChartConfig = {
	sales: {
		label: 'Ventas',
		color: 'hsl(var(--chart-1))',
	},
	returns: {
		label: 'Devoluciones',
		color: 'hsl(var(--chart-2))',
	},
} satisfies ChartConfig

export function WeeklyTransactionsLineChart() {
	const { dailyTransactionsForWeek } = useAnalytics()

	const parsedData = dailyTransactionsForWeek.dailyTransactions.map(
		(transaction) => ({
			day: capitalize(format(transaction.day, 'EEEE', { locale: es })),
			sales: transaction.sales,
			returns: transaction.returns,
		}),
	)

	const returnPercentage = dailyTransactionsForWeek.returnPercentage
	const returnPercentageFormatted = formatPercentage(returnPercentage)
	const formattedStartDate = format(
		dailyTransactionsForWeek.weekStartDate,
		'dd MMM',
		{
			locale: es,
		},
	)
	const formattedEndDate = format(
		dailyTransactionsForWeek.weekEndDate,
		'dd MMM',
		{
			locale: es,
		},
	)

	return (
		<Card className="">
			<CardHeader>
				<CardTitle>Transacciones esta semana</CardTitle>
				<CardDescription>Ventas y devoluciones procesadas.</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={line2ChartConfig}>
					<LineChart
						accessibilityLayer
						data={parsedData}
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
							tickFormatter={(value) => value.slice(0, 3)}
						/>
						<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
						<Line
							dataKey="sales"
							type="monotone"
							stroke="var(--color-sales)"
							strokeWidth={2}
							dot={false}
						/>
						<Line
							dataKey="returns"
							type="monotone"
							stroke="var(--color-returns)"
							strokeWidth={2}
							dot={false}
						/>
					</LineChart>
				</ChartContainer>
			</CardContent>
			<CardFooter>
				<div className="flex w-full items-start gap-2 text-sm">
					<div className="grid gap-2">
						<div className="flex items-center gap-2 font-medium leading-none">
							Porcentaje de devolución aproximado de {returnPercentageFormatted}
							<Icon name="reset" className="h-4 w-4" />
						</div>
						<div className="flex items-center gap-2 leading-none text-muted-foreground">
							Mostrando transacciones durante la semana {formattedStartDate} -{' '}
							{formattedEndDate}.
						</div>
					</div>
				</div>
			</CardFooter>
		</Card>
	)
}
