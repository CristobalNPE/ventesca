import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { formatCurrency } from '#app/utils/misc.tsx'

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '#app/components/ui/alert.tsx'
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '#app/components/ui/chart.tsx'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '#app/components/ui/tabs.js'
import { FILTER_PARAMS } from '#app/constants/filterParams.ts'
import { useNavigate } from '@remix-run/react'
import { Label, Pie, PieChart } from 'recharts'
import { useInventory } from '../../context/inventory/InventoryContext'
import { LOW_STOCK_CHANGE_FOR_CONFIG } from '../../routes/_inventory+/inventory'
const chartConfig = {} satisfies ChartConfig
export function InventoryStats() {
	const { stockData, bestSeller, mostProfit, hasActiveProducts } =
		useInventory()

	const zeroStockProducts = stockData.zeroStockProducts.length
	const lowStockProducts = stockData.lowStockProducts.length

	return (
		<div className="flex w-full flex-col gap-3 xl:max-w-[25rem]">
			{zeroStockProducts ? <ZeroStockAlert /> : null}
			{lowStockProducts && !zeroStockProducts ? <LowStockAlert /> : null}
			{bestSeller && mostProfit ? <TopStatsTabs /> : null}
			{hasActiveProducts && <InventoryValueChartCard />}
		</div>
	)
}

function ZeroStockAlert() {
	const { stockData } = useInventory()
	const zeroStockProducts = stockData.zeroStockProducts.length
	const navigate = useNavigate()

	return (
		<Alert
			onClick={() => {
				const newSearchParams = new URLSearchParams()
				newSearchParams.set(FILTER_PARAMS.STOCK, '0')
				navigate(`/inventory?${newSearchParams}`)
			}}
			variant="destructive"
			className="group animate-slide-left cursor-pointer p-3 transition-colors hover:bg-destructive"
		>
			<Icon
				name="alert-triangle"
				className="h-4 w-4 transition-all group-hover:translate-y-2 group-hover:scale-150"
			/>
			<AlertTitle className="font-bold transition-all duration-300 group-hover:translate-x-2">
				{zeroStockProducts === 1 ? `Producto` : `Productos`} sin existencias
			</AlertTitle>
			<AlertDescription className="transition-all duration-300 group-hover:translate-x-2">
				{zeroStockProducts === 1
					? `Existe ${zeroStockProducts} producto sin
									stock registrado.`
					: `Existen ${zeroStockProducts} productos sin
									stock registrado.`}
			</AlertDescription>
		</Alert>
	)
}
function LowStockAlert() {
	const { stockData } = useInventory()
	const lowStockProducts = stockData.lowStockProducts.length

	const navigate = useNavigate()
	return (
		<Alert
			onClick={() => {
				const newSearchParams = new URLSearchParams()
				newSearchParams.set(FILTER_PARAMS.STOCK, LOW_STOCK_CHANGE_FOR_CONFIG)
				navigate(`/inventory?${newSearchParams}`, {
					unstable_viewTransition: true,
				})
			}}
			className="group animate-slide-left cursor-pointer p-3 transition-colors hover:bg-secondary"
		>
			<Icon
				name="exclamation-circle"
				className="h-4 w-4 transition-all group-hover:translate-y-2 group-hover:scale-150"
			/>
			<AlertTitle className="font-bold transition-all duration-300 group-hover:translate-x-2">
				Productos con bajo stock
			</AlertTitle>
			<AlertDescription className="transition-all duration-300 group-hover:translate-x-2">
				Existen {lowStockProducts} productos con pocas existencias.{' '}
			</AlertDescription>
		</Alert>
	)
}

function InventoryValueChartCard() {
	const { inventoryValue } = useInventory()
	const chartData = inventoryValue.categoryBreakdown

	return (
		<Card className="flex flex-col">
			<CardHeader className="items-center pb-0">
				<CardTitle>Valor del Inventario</CardTitle>
			</CardHeader>
			<CardContent className="flex-1 pb-0">
				<ChartContainer
					config={chartConfig}
					className="mx-auto aspect-square h-[20rem]"
				>
					<PieChart>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									hideLabel
									formatter={(value, name) => (
										<>
											<div className="flex min-w-[130px] items-center gap-2 text-xs text-muted-foreground">
												{name}
												<div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
													{formatCurrency(Number(value))}
												</div>
											</div>
										</>
									)}
								/>
							}
						/>
						<Pie
							data={chartData}
							dataKey="totalSellingValue"
							nameKey="categoryDescription"
							innerRadius={90}
							strokeWidth={5}
						>
							<Label
								content={({ viewBox }) => {
									if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
										return (
											<text
												x={viewBox.cx}
												y={viewBox.cy}
												textAnchor="middle"
												dominantBaseline="middle"
											>
												<tspan
													x={viewBox.cx}
													y={viewBox.cy}
													className="fill-foreground text-2xl font-bold"
												>
													{formatCurrency(
														inventoryValue.overallTotals.totalSellingValue,
													)}
												</tspan>
												<tspan
													x={viewBox.cx}
													y={(viewBox.cy || 0) + 24}
													className="fill-muted-foreground"
												>
													Valor total potencial
												</tspan>
											</text>
										)
									}
								}}
							/>
						</Pie>
					</PieChart>
				</ChartContainer>
			</CardContent>
			<CardFooter className="w-full flex-col  gap-2 ">
				<div className="flex w-full flex-col gap-1 leading-none text-muted-foreground">
					<div className="flex w-full justify-between">
						<span>Costo del inventario :</span>
						<span className="font-semibold text-foreground ">
							{formatCurrency(inventoryValue.overallTotals.totalValue)}
						</span>
					</div>

					<div className="flex w-full justify-between">
						<span>Ganancia potencial :</span>
						<span className="font-semibold text-foreground ">
							{formatCurrency(inventoryValue.overallTotals.potentialProfit)}
						</span>
					</div>
					<div className="flex w-full justify-between">
						<span>Porcentaje de ganancia :</span>
						<span className="font-semibold text-foreground ">
							{inventoryValue.overallTotals.markupPercentage?.toFixed(1)}%
						</span>
					</div>
				</div>
			</CardFooter>
		</Card>
	)
}

function TopStatsTabs() {
	const { bestSeller, mostProfit } = useInventory()
	return (
		<Tabs defaultValue={'most-sold'} className="">
			<TabsList className="w-full">
				<TabsTrigger className="w-full" value={'most-sold'}>
					Mas Vendido
					<Icon name="trophy" className="ml-2" size="sm" />
				</TabsTrigger>
				<TabsTrigger className="w-full" value={'most-profit'}>
					Mayor Ganancia
					<Icon name="trending-up" className="ml-2" size="sm" />
				</TabsTrigger>
			</TabsList>
			<TabsContent value={'most-sold'}>
				<Card className="relative ">
					<Icon name="trophy" className="absolute right-5 top-5 text-4xl" />
					<CardHeader>
						<CardDescription>Articulo mas vendido</CardDescription>
						<CardTitle className="">
							{bestSeller?.product.name.slice(0, 25)}
						</CardTitle>
					</CardHeader>
					<CardContent className="flex justify-between">
						<div className="flex flex-col rounded border bg-secondary/50 p-4">
							<span className="text-sm text-muted-foreground">
								Unidades vendidas
							</span>
							<span className="text-2xl font-bold">
								{bestSeller?.totalSales}
							</span>
						</div>
						<div className="flex flex-col rounded border bg-secondary/50 p-4">
							<span className="text-sm text-muted-foreground">
								Ganancias totales
							</span>
							<span className="text-2xl font-bold">
								{formatCurrency(bestSeller?.totalProfit || 0)}
							</span>
						</div>
					</CardContent>
				</Card>
			</TabsContent>
			<TabsContent value={'most-profit'}>
				<Card className="relative ">
					<Icon
						name="trending-up"
						className="absolute right-5 top-5 text-4xl"
					/>
					<CardHeader>
						<CardDescription>Mayores ganancias</CardDescription>
						<CardTitle className="">
							{mostProfit?.product.name.slice(0, 25)}
						</CardTitle>
					</CardHeader>
					<CardContent className="flex justify-between">
						<div className="flex flex-col rounded border bg-secondary/50 p-4">
							<span className="text-sm text-muted-foreground">
								Ganancias totales
							</span>
							<span className="text-2xl font-bold">
								{formatCurrency(mostProfit?.totalProfit || 0)}
							</span>
						</div>
						<div className="flex flex-col rounded border bg-secondary/50 p-4">
							<span className="text-sm text-muted-foreground">
								Unidades vendidas
							</span>
							<span className="text-2xl font-bold">
								{mostProfit?.totalSales}
							</span>
						</div>
					</CardContent>
				</Card>
			</TabsContent>
		</Tabs>
	)
}
