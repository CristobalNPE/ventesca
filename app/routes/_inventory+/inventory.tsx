import { PaginationBar } from '#app/components/pagination-bar.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import { Sheet, SheetContent } from '#app/components/ui/sheet.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import {
	cn,
	formatCurrency,
	useDebounce,
	useIsPending,
} from '#app/utils/misc.tsx'
import Autoplay from 'embla-carousel-autoplay'

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '#app/components/ui/alert.tsx'
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from '#app/components/ui/carousel.tsx'
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from '#app/components/ui/chart.tsx'
import { Label as FormLabel } from '#app/components/ui/label.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { Category, Prisma } from '@prisma/client'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import {
	Form,
	Outlet,
	useLoaderData,
	useLocation,
	useNavigation,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import { useEffect, useId, useState } from 'react'
import { Label, Pie, PieChart } from 'recharts'
import { CreateItemDialog } from './inventory_.new.tsx'
import {
	getBestSellingProduct,
	getInventoryValueByCategory,
	getLowStockProducts,
	getMostProfitProduct,
} from './productService.server.ts'

const chartConfig = {} satisfies ChartConfig
const stockFilterParam = 'stock'
const categoryFilterParam = 'category'
const sortByParam = 'sort'
const sortDirectionParam = 'sort-direction'

const LOW_STOCK_CHANGE_FOR_CONFIG = '5'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const url = new URL(request.url)
	const $top = Number(url.searchParams.get('$top')) || 25
	const $skip = Number(url.searchParams.get('$skip')) || 0
	const searchTerm = url.searchParams.get('search') ?? ''

	const stockFilter = url.searchParams.get(stockFilterParam)
	const categoryFilter = url.searchParams.get(categoryFilterParam)
	const sortBy = url.searchParams.get(sortByParam)
	const sortDirection = url.searchParams.get(sortDirectionParam)

	const sortOptions: Record<string, Prisma.ProductOrderByWithRelationInput> = {
		name: { name: sortDirection === SortDirection.ASC ? 'asc' : 'desc' },
		'selling-price': {
			sellingPrice: sortDirection === SortDirection.ASC ? 'asc' : 'desc',
		},
		stock: { stock: sortDirection === SortDirection.ASC ? 'asc' : 'desc' },
		code: {
			code: sortDirection === SortDirection.ASC ? 'asc' : 'desc',
		},
	}

	const searchTermIsCode = !isNaN(parseInt(searchTerm))
	const productSelect: Prisma.ProductSelect = {
		id: true,
		code: true,
		name: true,
		sellingPrice: true,
		stock: true,
		isActive: true,
		category: { select: { id: true, description: true } },
	}

	const filters: Prisma.ProductWhereInput = {
		businessId,
		...(stockFilter && {
			stock: { lte: Number.parseInt(stockFilter) },
		}),
		...(categoryFilter && { categoryId: categoryFilter }),
		...(searchTermIsCode
			? { code: searchTerm }
			: { name: { contains: searchTerm } }),
	}

	const productsPromise = prisma.product.findMany({
		take: $top,
		skip: $skip,
		where: filters,
		select: productSelect,
		orderBy:
			sortBy && sortOptions[sortBy] ? sortOptions[sortBy] : { name: 'asc' },
	})

	const totalProductsPromise = prisma.product.count({ where: filters })

	const inventoryValuePromise = getInventoryValueByCategory(businessId)
	const stockDataPromise = getLowStockProducts(
		businessId,
		Number.parseInt(LOW_STOCK_CHANGE_FOR_CONFIG),
	)
	const bestSellerPromise = getBestSellingProduct(businessId)
	const mostProfitPromise = getMostProfitProduct(businessId)
	const allCategoriesPromise = prisma.category.findMany({
		where: { businessId },
		select: { id: true, description: true },
	})

	const [
		products,
		totalProducts,
		inventoryValue,
		stockData,
		bestSeller,
		mostProfit,
		allCategories,
	] = await Promise.all([
		productsPromise,
		totalProductsPromise,
		inventoryValuePromise,
		stockDataPromise,
		bestSellerPromise,
		mostProfitPromise,
		allCategoriesPromise,
	])

	return json({
		products,
		totalProducts,
		inventoryValue,
		stockData,
		bestSeller,
		mostProfit,
		allCategories,
	})
}

export default function InventoryRoute() {
	const isAdmin = true
	const {
		products,
		totalProducts,
		inventoryValue,
		stockData,
		bestSeller,
		mostProfit,
		allCategories,
	} = useLoaderData<typeof loader>()

	const [searchParams, setSearchParams] = useSearchParams()
	const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false)
	const location = useLocation()
	const navigation = useNavigation()

	const chartData = inventoryValue.categoryBreakdown
	const zeroStockProducts = stockData.zeroStockProducts.length
	const lowStockProducts = stockData.lowStockProducts.length

	useEffect(() => {
		if (location.pathname !== '/inventory') {
			const productId = location.pathname.split('/').pop()
			if (productId) {
				if (navigation.state === 'idle') {
					setIsDetailsSheetOpen(true)
				}
			}
		}
	}, [location.pathname, navigation.state])

	return (
		<main className="flex h-full  flex-col gap-4">
			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
				<h1 className="text-xl font-semibold">Administración de Inventario</h1>
				{isAdmin ? (
					<div className="hidden flex-col gap-2 sm:flex sm:flex-row-reverse sm:gap-4">
						<CreateItemDialog />
						<Button size={'sm'} variant={'outline'}>
							Modificar precios
						</Button>
						<Button size={'sm'} variant={'outline'}>
							Generar reporte
						</Button>
					</div>
				) : null}
			</div>

			<div className="flex w-full flex-1 flex-col gap-4  xl:h-[48rem] xl:flex-row">
				<div className="flex h-full w-full flex-1 flex-col-reverse gap-4  xl:flex-row-reverse ">
					<div className="flex w-full flex-col gap-3 xl:max-w-[25rem]">
						{isAdmin ? (
							<div className="flex flex-col gap-2 sm:hidden sm:flex-row-reverse sm:gap-4">
								<CreateItemDialog />
								<Button size={'sm'} variant={'outline'}>
									Modificar precios
								</Button>
								<Button size={'sm'} variant={'outline'}>
									Generar reporte
								</Button>
							</div>
						) : null}

						{zeroStockProducts ? (
							<Alert
								onClick={() => {
									const newSearchParams = new URLSearchParams()
									newSearchParams.set(stockFilterParam, '0')

									setSearchParams(newSearchParams)
								}}
								variant="destructive"
								className="group animate-slide-left cursor-pointer p-3 transition-colors hover:bg-destructive"
							>
								<Icon
									name="alert-triangle"
									className="h-4 w-4 transition-all group-hover:translate-y-2 group-hover:scale-150"
								/>
								<AlertTitle className="font-bold transition-all duration-300 group-hover:translate-x-2">
									{zeroStockProducts === 1 ? `Producto` : `Productos`} sin
									existencias
								</AlertTitle>
								<AlertDescription className="transition-all duration-300 group-hover:translate-x-2">
									{zeroStockProducts === 1
										? `Existe ${zeroStockProducts} producto sin
									stock registrado.`
										: `Existen ${zeroStockProducts} productos sin
									stock registrado.`}
								</AlertDescription>
							</Alert>
						) : null}
						{lowStockProducts && !zeroStockProducts ? (
							<Alert
								onClick={() => {
									const newSearchParams = new URLSearchParams()
									newSearchParams.set(
										stockFilterParam,
										LOW_STOCK_CHANGE_FOR_CONFIG,
									)
									setSearchParams(newSearchParams)
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
						) : null}
						{bestSeller && mostProfit ? (
							<Carousel
								plugins={[
									Autoplay({
										delay: 8000,
									}),
								]}
							>
								<CarouselContent>
									<CarouselItem>
										<Card className="relative ">
											<Icon
												name="trophy"
												className="absolute right-5 top-5 text-4xl"
											/>
											<CardHeader>
												<CardDescription>Articulo mas vendido</CardDescription>
												<CardTitle className="">
													{bestSeller.item.name.slice(0, 25)}
												</CardTitle>
											</CardHeader>
											<CardContent className="flex justify-between">
												<div className="flex flex-col rounded border bg-secondary/50 p-4">
													<span className="text-sm text-muted-foreground">
														Unidades vendidas
													</span>
													<span className="text-2xl font-bold">
														{bestSeller.totalSales}
													</span>
												</div>
												<div className="flex flex-col rounded border bg-secondary/50 p-4">
													<span className="text-sm text-muted-foreground">
														Ganancias totales
													</span>
													<span className="text-2xl font-bold">
														{formatCurrency(bestSeller.totalProfit)}
													</span>
												</div>
											</CardContent>
										</Card>
									</CarouselItem>
									<CarouselItem>
										<Card className="relative ">
											<Icon
												name="trending-up"
												className="absolute right-5 top-5 text-4xl"
											/>
											<CardHeader>
												<CardDescription>Mayores ganancias</CardDescription>
												<CardTitle className="">
													{mostProfit.item.name.slice(0, 25)}
												</CardTitle>
											</CardHeader>
											<CardContent className="flex justify-between">
												<div className="flex flex-col rounded border bg-secondary/50 p-4">
													<span className="text-sm text-muted-foreground">
														Ganancias totales
													</span>
													<span className="text-2xl font-bold">
														{formatCurrency(mostProfit.totalProfit)}
													</span>
												</div>
												<div className="flex flex-col rounded border bg-secondary/50 p-4">
													<span className="text-sm text-muted-foreground">
														Unidades vendidas
													</span>
													<span className="text-2xl font-bold">
														{mostProfit.totalSales}
													</span>
												</div>
											</CardContent>
										</Card>
									</CarouselItem>
								</CarouselContent>
								<CarouselPrevious className="-left-3   top-3/4" />
								<CarouselNext className="-right-3  top-3/4" />
							</Carousel>
						) : null}

						{products.some(product => product.isActive) ? (
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
												content={<ChartTooltipContent />}
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
																			inventoryValue.overallTotals
																				.totalSellingValue,
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
												{formatCurrency(
													inventoryValue.overallTotals.totalValue,
												)}
											</span>
										</div>

										<div className="flex w-full justify-between">
											<span>Ganancia potencial :</span>
											<span className="font-semibold text-foreground ">
												{formatCurrency(
													inventoryValue.overallTotals.potentialProfit,
												)}
											</span>
										</div>
										<div className="flex w-full justify-between">
											<span>Porcentaje de ganancia :</span>
											<span className="font-semibold text-foreground ">
												{inventoryValue.overallTotals.markupPercentage?.toFixed(
													1,
												)}
												%
											</span>
										</div>
									</div>
								</CardFooter>
							</Card>
						) : null}
					</div>
					<ProductsTableCard
						allCategories={allCategories}
						totalProducts={totalProducts}
						products={products}
					/>
				</div>
			</div>
			<Sheet
				modal={false}
				open={isDetailsSheetOpen}
				onOpenChange={setIsDetailsSheetOpen}
			>
				<SheetContent className="p-0 ">
					<Outlet />
				</SheetContent>
			</Sheet>
		</main>
	)
}

type ProductData = {
	name: string | null
	code: string
	id: string
	sellingPrice: number | null
	stock: number
	category: {
		id: string
		description: string
	}
}
function ProductsTableCard({
	allCategories,
	products,
	totalProducts,
}: {
	allCategories: Pick<Category, 'id' | 'description'>[]
	products: ProductData[]
	totalProducts: number
}) {
	return (
		<Card className="no-scrollbar relative  h-full flex-grow overflow-y-auto">
			<CardHeader className="sticky top-0 z-10 flex flex-col  gap-1 bg-card px-7">
				<div className="flex w-full justify-between ">
					<div className="w-fit">
						<CardTitle>Artículos</CardTitle>
						{products.length > 1 ? (
							<CardDescription>
								Mostrando {products.length} de {totalProducts} artículos
								registrados.
							</CardDescription>
						) : null}
					</div>
					<PaginationBar total={totalProducts} top={25} />
				</div>
				<div className="flex flex-wrap gap-4">
					<div className="flex-1">
						<InventorySearchBar status="idle" autoSubmit />
					</div>
					<InventoryFilters categories={allCategories} />
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-3 sm:gap-1 ">
				{products.map(product => (
					<LinkWithParams
						key={product.id}
						prefetch={'intent'}
						className={({ isActive }) =>
							cn(
								'flex flex-row items-center justify-between gap-5 rounded-sm border-2 border-l-8 border-transparent border-b-secondary/30 border-l-secondary/80 p-2 text-sm transition-colors hover:bg-secondary ',
								isActive && 'border-primary/10 bg-secondary',
							)
						}
						preserveSearch
						to={product.id}
					>
						<div className="flex w-[55%] flex-col  overflow-clip  text-nowrap text-left font-semibold uppercase ">
							<span>{product.name}</span>
							<div className="flex items-center gap-1 text-muted-foreground">
								<Icon name="scan-barcode" className="text-xs" />
								<span>{product.code}</span>
							</div>
						</div>

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="hidden w-[15%] sm:block ">
										<Badge variant="outline">
											{product.category.description}
										</Badge>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>Categoría</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div
										className={cn(
											'hidden w-[10%] text-nowrap text-center  text-xs  text-muted-foreground sm:block ',
											product.stock === 0 && 'text-destructive',
										)}
									>
										<div className="flex items-center justify-center gap-1">
											<Icon name="package" className="" />
											<span className="font-semibold ">{product.stock}</span>
										</div>
										<div className="">
											{product.stock === 0
												? 'sin stock'
												: product.stock === 1
													? 'unidad'
													: 'unidades'}
										</div>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>Stock</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="w-[20%] text-nowrap text-end font-bold text-muted-foreground ">
										{formatCurrency(product.sellingPrice)}
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p>Precio de venta</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</LinkWithParams>
				))}
			</CardContent>
		</Card>
	)
}

function InventorySearchBar({
	status,
	autoFocus = false,
	autoSubmit = false,
}: {
	status: 'idle' | 'pending' | 'success' | 'error'

	autoFocus?: boolean
	autoSubmit?: boolean
}) {
	const id = useId()
	const [searchParams] = useSearchParams()
	const submit = useSubmit()
	const isSubmitting = useIsPending({
		formMethod: 'GET',
		formAction: '/inventory',
	})

	const handleFormChange = useDebounce((form: HTMLFormElement) => {
		submit(form)
	}, 400)

	return (
		<Form
			method="GET"
			action="/inventory"
			className="flex  min-w-60 items-center justify-center  gap-1"
			onChange={e => autoSubmit && handleFormChange(e.currentTarget)}
		>
			<div className="flex-1">
				<FormLabel htmlFor={id} className="sr-only">
					Buscar
				</FormLabel>
				<Input
					type="text"
					name="search"
					id={id}
					defaultValue={searchParams.get('search') ?? ''}
					placeholder="Búsqueda"
					className=" [&::-webkit-inner-spin-button]:appearance-none"
					autoFocus={autoFocus}
				/>
			</div>
			<div>
				<StatusButton
					type="submit"
					status={isSubmitting ? 'pending' : status}
					className="flex w-full items-center justify-center"
					size="sm"
				>
					<Icon name="magnifying-glass" size="md" />
					<span className="sr-only">Buscar</span>
				</StatusButton>
			</div>
		</Form>
	)
}
enum SortDirection {
	ASC = 'asc',
	DESC = 'desc',
}
function InventoryFilters({
	categories,
}: {
	categories: Pick<Category, 'id' | 'description'>[]
}) {
	const [searchParams, setSearchParams] = useSearchParams()
	const [sortDirection, setSortDirection] = useState<SortDirection>(
		SortDirection.DESC,
	)

	return (
		<div className="flex flex-wrap gap-4">
			<div className="relative ">
				<FormLabel className="absolute -top-2 left-2 z-30 rounded bg-background p-[1px] text-xs text-muted-foreground">
					Filtrar por stock
				</FormLabel>
				<Select
					onValueChange={value => {
						const newSearchParams = new URLSearchParams(searchParams)
						if (value === 'all') {
							newSearchParams.delete(stockFilterParam)
						} else {
							newSearchParams.set(stockFilterParam, value)
						}
						setSearchParams(newSearchParams)
					}}
				>
					<SelectTrigger className="w-full sm:w-[180px]">
						<SelectValue placeholder="Sin Filtros" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Sin Filtros</SelectItem>
						<SelectItem value={LOW_STOCK_CHANGE_FOR_CONFIG}>
							Bajo Stock
						</SelectItem>
						<SelectItem value="0">Sin Stock</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className="relative ">
				<FormLabel className="absolute -top-2 left-2 z-30 rounded bg-background p-[1px] text-xs text-muted-foreground ">
					Filtrar por categoría
				</FormLabel>
				<Select
					onValueChange={value => {
						const newSearchParams = new URLSearchParams(searchParams)
						if (value === 'all') {
							newSearchParams.delete(categoryFilterParam)
						} else {
							newSearchParams.set(categoryFilterParam, value)
						}
						setSearchParams(newSearchParams)
					}}
				>
					<SelectTrigger className="w-full sm:w-[180px]">
						<SelectValue placeholder="Sin Filtros" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Sin Filtros</SelectItem>
						{categories.map(category => (
							<SelectItem key={category.id} value={category.id}>
								{category.description}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="relative flex w-full gap-1 sm:w-[250px] ">
				<FormLabel className="absolute -top-2 left-2 z-30 rounded bg-background p-[1px] text-xs text-muted-foreground ">
					Ordenar por
				</FormLabel>
				<Select
					onValueChange={value => {
						const newSearchParams = new URLSearchParams(searchParams)
						if (value === 'default') {
							newSearchParams.delete(sortByParam)
						} else {
							newSearchParams.set(sortByParam, value)
						}
						setSearchParams(newSearchParams)
					}}
				>
					<SelectTrigger className="">
						<SelectValue placeholder="Por Defecto" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="default">Por Defecto</SelectItem>
						<SelectItem value="name">Nombre</SelectItem>
						<SelectItem value="stock">Stock</SelectItem>
						<SelectItem value="code">Código</SelectItem>
						<SelectItem value="selling-price">Precio de venta</SelectItem>
					</SelectContent>
				</Select>
				{sortDirection === SortDirection.DESC ? (
					<Button
						onClick={() => {
							setSortDirection(SortDirection.ASC)
							const newSearchParams = new URLSearchParams(searchParams)
							newSearchParams.set(sortDirectionParam, sortDirection)
							setSearchParams(newSearchParams)
						}}
						variant={'outline'}
						size={'icon'}
					>
						<Icon size="sm" name="double-arrow-down" />
						<span className="sr-only">Cambiar dirección de orden</span>
					</Button>
				) : (
					<Button
						onClick={() => {
							setSortDirection(SortDirection.DESC)
							const newSearchParams = new URLSearchParams(searchParams)
							newSearchParams.set(sortDirectionParam, sortDirection)
							setSearchParams(newSearchParams)
						}}
						variant={'outline'}
						size={'icon'}
					>
						<Icon size="sm" name="double-arrow-up" />
						<span className="sr-only">Cambiar dirección de orden</span>
					</Button>
				)}
			</div>
		</div>
	)
}
