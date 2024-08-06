import { DashboardHeader } from '#app/components/dashboard/dashboard-header.tsx'
import { Spacer } from '#app/components/spacer.tsx'
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
import { Icon } from '#app/components/ui/icon.tsx'
import { Progress } from '#app/components/ui/progress.tsx'
import {
	Tabs,
	TabsList,
	TabsTrigger,
	TabsContent,
} from '#app/components/ui/tabs.tsx'
import { OrderStatus } from '#app/types/orders/order-status.ts'
import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency } from '#app/utils/misc.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { json, LoaderFunctionArgs } from '@remix-run/node'
import { TrendingUp } from 'lucide-react'
import {
	LineChart,
	CartesianGrid,
	XAxis,
	Line,
	PieChart,
	Pie,
	BarChart,
	YAxis,
	Bar,
	LabelList,
} from 'recharts'

/////////////////////////
const chartData = [
	{ month: 'January', desktop: 186 },
	{ month: 'February', desktop: 305 },
	{ month: 'March', desktop: 237 },
	{ month: 'April', desktop: 73 },
	{ month: 'May', desktop: 209 },
	{ month: 'June', desktop: 214 },
]

const chartConfig = {
	desktop: {
		label: 'Desktop',
		color: 'hsl(var(--chart-1))',
	},
} satisfies ChartConfig

const pieChartData = [
	{ browser: 'chrome', visitors: 275, fill: 'var(--color-chrome)' },
	{ browser: 'safari', visitors: 200, fill: 'var(--color-safari)' },
	{ browser: 'firefox', visitors: 187, fill: 'var(--color-firefox)' },
	{ browser: 'edge', visitors: 173, fill: 'var(--color-edge)' },
	{ browser: 'other', visitors: 90, fill: 'var(--color-other)' },
]

const pieChartConfig = {
	visitors: {
		label: 'Visitors',
	},
	chrome: {
		label: 'Chrome',
		color: 'hsl(var(--chart-1))',
	},
	safari: {
		label: 'Safari',
		color: 'hsl(var(--chart-2))',
	},
	firefox: {
		label: 'Firefox',
		color: 'hsl(var(--chart-3))',
	},
	edge: {
		label: 'Edge',
		color: 'hsl(var(--chart-4))',
	},
	other: {
		label: 'Other',
		color: 'hsl(var(--chart-5))',
	},
} satisfies ChartConfig

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
	desktop: {
		label: 'Desktop',
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

const line2ChartData = [
	{ month: 'January', desktop: 186, mobile: 80 },
	{ month: 'February', desktop: 305, mobile: 200 },
	{ month: 'March', desktop: 237, mobile: 120 },
	{ month: 'April', desktop: 73, mobile: 190 },
	{ month: 'May', desktop: 209, mobile: 130 },
	{ month: 'June', desktop: 214, mobile: 140 },
]

const line2ChartConfig = {
	desktop: {
		label: 'Desktop',
		color: 'hsl(var(--chart-1))',
	},
	mobile: {
		label: 'Mobile',
		color: 'hsl(var(--chart-2))',
	},
} satisfies ChartConfig
/////////////////////////
export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const business = await prisma.business.findUniqueOrThrow({
		include: { image: true },
		where: { id: businessId },
	})

	const numberOfProducts = await prisma.product.count({
		where: { businessId, isDeleted: false },
	})
	const numberOfCompletedOrders = await prisma.order.count({
		where: { businessId, status: OrderStatus.FINISHED },
	})
	const totalProfits = await prisma.order.aggregate({
		_sum: {
			total: true,
		},
		where: { businessId, status: OrderStatus.FINISHED },
	})

	return json({
		business,
		numberOfProducts,
		numberOfCompletedOrders,
		totalProfits,
	})
}
export default function Dashboard() {
	return (
		<>
			<DashboardHeader />
			<Spacer size="4xs" />
			<main className="grid gap-6  sm:grid-cols-7">
				<div className="grid gap-y-6 sm:col-span-5 sm:grid-cols-5  sm:gap-x-6">
					<div className="col-span-2 grid gap-6 ">
						<TotalProfit />
						<TotalProfit />
						<ProfitLineCharts />
					</div>
					<div className="col-span-3 grid gap-6 ">
						<WeeklyTransactionsLineChart />
						<DailySalesTargetProgress />
					</div>
				</div>
				<div className="grid gap-6 sm:col-span-2">
					<TopSellingProductsBarChart />
				</div>
			</main>
		</>
	)
	return (
		<>
			<DashboardHeader />
			<Spacer size="4xs" />
			<main className="grid gap-4  sm:grid-cols-7">
				<div className="grid gap-4 sm:col-span-5">
					<div className="grid gap-4 md:grid-cols-2 ">
						<TotalProfit />
						<DailySalesTargetProgress />
					</div>
					<div className="grid gap-4 md:grid-cols-2 ">
						{/* <TotalSalesPieCharts /> */}
						<ProfitLineCharts />
						<div className=" grid">
							<WeeklyTransactionsLineChart />
						</div>
					</div>
				</div>
				<div className="grid  w-full gap-4 sm:col-span-2">
					<TopSellingProductsBarChart />
				</div>
			</main>
		</>
	)
}

//Ganancias totales (card)
//Ganancias por semana-mes (line-chart)
//ventas completadas vendedor hoy-semana-mes (pie-chart)
//Top Selling Products (bar chart)
//Daily Sales Target Progress (progress bar)
//transacciones completadas diarias (line-chart, semanal) (different for sales, returns)

function WeeklyTransactionsLineChart() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Line Chart - Multiple</CardTitle>
				<CardDescription>January - June 2024</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={line2ChartConfig}>
					<LineChart
						accessibilityLayer
						data={line2ChartData}
						margin={{
							left: 12,
							right: 12,
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="month"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={value => value.slice(0, 3)}
						/>
						<ChartTooltip cursor={false} content={<ChartTooltipContent />} />
						<Line
							dataKey="desktop"
							type="monotone"
							stroke="var(--color-desktop)"
							strokeWidth={2}
							dot={false}
						/>
						<Line
							dataKey="mobile"
							type="monotone"
							stroke="var(--color-mobile)"
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
							Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
						</div>
						<div className="flex items-center gap-2 leading-none text-muted-foreground">
							Showing total visitors for the last 6 months
						</div>
					</div>
				</div>
			</CardFooter>
		</Card>
	)
}

function DailySalesTargetProgress() {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardDescription>This Week</CardDescription>
				<CardTitle className="text-4xl">$1,329</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="text-xs text-muted-foreground">+25% from last week</div>
			</CardContent>
			<CardFooter>
				<Progress value={25} aria-label="25% increase" />
			</CardFooter>
		</Card>
	)
}
function TopSellingProductsBarChart() {
	return (
		<Card className="flex flex-col ">
			<CardHeader>
				<CardTitle>Bar Chart - Custom Label</CardTitle>
				<CardDescription>January - June 2024</CardDescription>
			</CardHeader>
			<CardContent className="flex-1 ">
				<ChartContainer config={barChartConfig} className="h-full w-full">
					<BarChart
						accessibilityLayer
						data={barChartData}
						layout="vertical"
						margin={{
							right: 16,
						}}
					>
						<CartesianGrid horizontal={false} />
						<YAxis
							dataKey="month"
							type="category"
							tickLine={false}
							tickMargin={10}
							axisLine={false}
							tickFormatter={value => value.slice(0, 3)}
							hide
						/>
						<XAxis dataKey="desktop" type="number" hide />
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent indicator="line" />}
						/>
						<Bar
							dataKey="desktop"
							layout="vertical"
							fill="var(--color-desktop)"
							radius={4}
						>
							<LabelList
								dataKey="month"
								position="insideLeft"
								offset={8}
								className="fill-[--color-label]"
								fontSize={12}
							/>
							<LabelList
								dataKey="desktop"
								position="right"
								offset={8}
								className="fill-foreground"
								fontSize={12}
							/>
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
			<CardFooter className="flex-col items-start gap-2 text-sm">
				<div className="flex gap-2 font-medium leading-none">
					Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
				</div>
				<div className="leading-none text-muted-foreground">
					Showing total visitors for the last 6 months
				</div>
			</CardFooter>
		</Card>
	)
}
function TotalSalesPieCharts() {
	return (
		<Card className="">
			<CardHeader className=" p-6 pb-4 ">
				<CardTitle>Ventas por vendedor</CardTitle>
			</CardHeader>
			<Tabs defaultValue="week" className="w-full px-4 ">
				<TabsList className="w-full">
					<TabsTrigger className="w-full" value="today">
						Hoy
					</TabsTrigger>
					<TabsTrigger className="w-full" value="week">
						Esta semana
					</TabsTrigger>
					<TabsTrigger className="w-full" value="month">
						Este mes
					</TabsTrigger>
				</TabsList>
				<TabsContent value="today">
					<TotalSalesToday />
				</TabsContent>
				<TabsContent value="week">
					<TotalSalesWeek />
				</TabsContent>
				<TabsContent value="month">
					<TotalSalesMonth />
				</TabsContent>
			</Tabs>
		</Card>
	)
}

function TotalSalesToday() {
	return (
		<div className="flex flex-col ">
			<CardHeader className="items-center pb-0">
				<CardDescription>
					Ventas realizadas hoy 12 de marzo 2024
				</CardDescription>
			</CardHeader>
			<CardContent className="flex-1 pb-0 ">
				<ChartContainer
					config={pieChartConfig}
					className="mx-auto aspect-square h-full pb-0 [&_.recharts-pie-label-text]:fill-foreground"
				>
					<PieChart>
						<ChartTooltip content={<ChartTooltipContent hideLabel />} />
						<Pie
							data={pieChartData}
							dataKey="visitors"
							label
							nameKey="browser"
						/>
					</PieChart>
				</ChartContainer>
			</CardContent>
			<CardFooter className="flex-col gap-2 text-sm">
				<div className="flex items-center gap-2 font-medium leading-none">
					Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
				</div>
				<div className="leading-none text-muted-foreground">
					Showing total visitors for the last 6 months
				</div>
			</CardFooter>
		</div>
	)
}

function TotalSalesWeek() {
	return (
		<div className="flex flex-col">
			<CardHeader className="items-center pb-0">
				<CardDescription>
					Ventas realizadas esta semana 12 - 19 marzo 2024
				</CardDescription>
			</CardHeader>
			<CardContent className="flex-1 pb-0">
				<ChartContainer
					config={pieChartConfig}
					className="mx-auto aspect-square max-h-[250px] pb-0 [&_.recharts-pie-label-text]:fill-foreground"
				>
					<PieChart>
						<ChartTooltip content={<ChartTooltipContent hideLabel />} />
						<Pie
							data={pieChartData}
							dataKey="visitors"
							label
							nameKey="browser"
						/>
					</PieChart>
				</ChartContainer>
			</CardContent>
			<CardFooter className="flex-col gap-2 text-sm">
				<div className="flex items-center gap-2 font-medium leading-none">
					Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
				</div>
				<div className="leading-none text-muted-foreground">
					Showing total visitors for the last 6 months
				</div>
			</CardFooter>
		</div>
	)
}

function TotalSalesMonth() {
	return (
		<div className="flex flex-col">
			<CardHeader className="items-center pb-0">
				<CardDescription>
					Ventas realizadas este mes, marzo 2024
				</CardDescription>
			</CardHeader>
			<CardContent className="flex-1 pb-0">
				<ChartContainer
					config={pieChartConfig}
					className="mx-auto aspect-square max-h-[250px] pb-0 [&_.recharts-pie-label-text]:fill-foreground"
				>
					<PieChart>
						<ChartTooltip content={<ChartTooltipContent hideLabel />} />
						<Pie
							data={pieChartData}
							dataKey="visitors"
							label
							nameKey="browser"
						/>
					</PieChart>
				</ChartContainer>
			</CardContent>
			<CardFooter className="flex-col gap-2 text-sm">
				<div className="flex items-center gap-2 font-medium leading-none">
					Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
				</div>
				<div className="leading-none text-muted-foreground">
					Showing total visitors for the last 6 months
				</div>
			</CardFooter>
		</div>
	)
}

function TotalProfit() {
	return (
		<Card className="grid w-full   gap-6 p-6">
			<div className="flex items-center gap-4">
				<div className="flex items-center justify-center rounded-md bg-primary p-3">
					<Icon
						name="currency-dollar"
						className="h-6 w-6 text-primary-foreground"
					/>
				</div>
				<div className="grid gap-1">
					<h3 className="text-xl font-semibold">
						{formatCurrency(111999)} ganancias totales.
					</h3>
					<p className="text-sm text-muted-foreground">
						Total de ganancias ingresadas desde el registro de la empresa.
					</p>
				</div>
			</div>
		</Card>
	)
}

function ProfitLineCharts() {
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
	return (
		<>
			<CardHeader>
				<CardDescription>January - June 2024</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig}>
					<LineChart
						accessibilityLayer
						data={chartData}
						margin={{
							left: 12,
							right: 12,
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="month"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={value => value.slice(0, 3)}
						/>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent hideLabel />}
						/>
						<Line
							dataKey="desktop"
							type="linear"
							stroke="var(--color-desktop)"
							strokeWidth={2}
							dot={false}
						/>
					</LineChart>
				</ChartContainer>
			</CardContent>
			<CardFooter className="flex-col items-start gap-2 text-sm">
				<div className="flex gap-2 font-medium leading-none">
					Trending up by 5.2% this semana <TrendingUp className="h-4 w-4" />
				</div>
				<div className="leading-none text-muted-foreground">
					Showing total visitors for the last 6 semana
				</div>
			</CardFooter>
		</>
	)
}
function ProfitByMonthChart() {
	return (
		<>
			<CardHeader>
				<CardDescription>January - June 2024</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig}>
					<LineChart
						accessibilityLayer
						data={chartData}
						margin={{
							left: 12,
							right: 12,
						}}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="month"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							tickFormatter={value => value.slice(0, 3)}
						/>
						<ChartTooltip
							cursor={false}
							content={<ChartTooltipContent hideLabel />}
						/>
						<Line
							dataKey="desktop"
							type="linear"
							stroke="var(--color-desktop)"
							strokeWidth={2}
							dot={false}
						/>
					</LineChart>
				</ChartContainer>
			</CardContent>
			<CardFooter className="flex-col items-start gap-2 text-sm">
				<div className="flex gap-2 font-medium leading-none">
					Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
				</div>
				<div className="leading-none text-muted-foreground">
					Showing total visitors for the last 6 months
				</div>
			</CardFooter>
		</>
	)
}
