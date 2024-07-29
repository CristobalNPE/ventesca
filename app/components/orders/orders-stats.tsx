import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Progress } from '#app/components/ui/progress.tsx'
import { formatCurrency } from '#app/utils/misc.tsx'
import { endOfWeek, format, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'

import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
} from '#app/components/ui/chart.tsx'
import { Bar, BarChart, CartesianGrid, TooltipProps, XAxis } from 'recharts'
import { useOrders } from '#app/context/orders/OrdersContext.tsx'
import {
	NameType,
	ValueType,
} from 'recharts/types/component/DefaultTooltipContent'

const chartConfig = {
	earnings: {
		label: 'Ingresos',
		color: 'hsl(var(--chart-1))',
	},
} satisfies ChartConfig

export function OrdersStats() {
	const { dayEarnings, weekEarnings, weekDailyEarnings } = useOrders()
	return (
		<div className="flex w-full flex-col  gap-4 xl:max-w-[25rem]   ">
			<Card className="w-full">
				<CardHeader className="pb-2">
					<CardDescription>Ingresos hoy</CardDescription>
					<CardTitle className="flex items-center gap-4 text-4xl">
						<span>{formatCurrency(dayEarnings.todaysEarnings)}</span>
						{dayEarnings.isIncrease ? (
							<Icon className="text-3xl" name="arrow-up" />
						) : null}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{dayEarnings.isIncrease ? (
						<div className="text-xs text-muted-foreground">
							+{dayEarnings.percentageDifference}% de ingresos respecto ayer
						</div>
					) : (
						<div className="text-xs text-muted-foreground">
							{dayEarnings.percentageDifference}% de los ingresos de ayer
						</div>
					)}
				</CardContent>
				<CardFooter>
					<Progress
						value={dayEarnings.percentageDifference}
						aria-label={
							dayEarnings.isIncrease
								? `${dayEarnings.percentageDifference}% incremento de ganancias`
								: `${dayEarnings.percentageDifference}% de ganancias de ayer`
						}
					/>
				</CardFooter>
			</Card>
			<Card className="w-full">
				<CardHeader className="pb-2">
					<CardDescription>Ingresos esta semana</CardDescription>
					<CardTitle className="flex items-center gap-4 text-4xl">
						<span>{formatCurrency(weekEarnings.thisWeekEarnings)} </span>
						{weekEarnings.isIncrease ? (
							<Icon className="text-3xl" name="arrow-up" />
						) : null}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{weekEarnings.isIncrease ? (
						<div className="text-xs text-muted-foreground">
							+{weekEarnings.percentageDifference}% de ingresos respecto la
							semana pasada
						</div>
					) : (
						<div className="text-xs text-muted-foreground">
							{weekEarnings.percentageDifference}% de los ingresos de la semana
							anterior
						</div>
					)}
				</CardContent>
				<CardFooter>
					<Progress
						value={weekEarnings.percentageDifference}
						aria-label={
							weekEarnings.isIncrease
								? `${weekEarnings.percentageDifference}% incremento de ganancias`
								: `${weekEarnings.percentageDifference}% de ganancias de la semana anterior`
						}
					/>
				</CardFooter>
			</Card>
			<Card className="flex h-full w-full flex-1 flex-col">
				<CardHeader className="pb-2">
					<CardTitle>Detalle ingresos semanal</CardTitle>
					<CardDescription>
						Semana{' '}
						{`${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd', {
							locale: es,
						})} a ${format(
							endOfWeek(new Date(), { weekStartsOn: 1 }),
							"dd 'de' MMMM",
							{
								locale: es,
							},
						)}`}{' '}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-1 flex-col items-center justify-center">
					<ChartContainer config={chartConfig} className="h-full w-full">
						<BarChart accessibilityLayer data={weekDailyEarnings}>
							<CartesianGrid strokeDasharray={'3 3'} vertical={false} />
							<XAxis
								dataKey="day"
								tickLine={false}
								tickMargin={10}
								axisLine={false}
								tickFormatter={value => value.slice(0, 3)}
							/>
							<ChartTooltip cursor={false} content={<CustomTooltip />} />
							<Bar dataKey="earnings" fill="var(--color-earnings)" radius={8} />
						</BarChart>
					</ChartContainer>
				</CardContent>
				<CardFooter></CardFooter>
			</Card>
		</div>
	)
}

const CustomTooltip = ({
	active,
	payload,
	label,
}: TooltipProps<ValueType, NameType>) => {
	if (active && payload && payload.length) {
		return (
			<div className="flex items-center gap-1 rounded border bg-background p-1">
				<div className="h-2 w-2 bg-primary "></div>
				<p className="font-semibold capitalize">{`${label} : ${formatCurrency(Number(payload?.[0]?.value))}`}</p>
			</div>
		)
	}

	return null
}
