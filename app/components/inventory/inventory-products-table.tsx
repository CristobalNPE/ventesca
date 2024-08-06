import { PaginationBar } from '#app/components/pagination-bar.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'

import { useInventory } from '../../context/inventory/InventoryContext'
import { InventoryFilters } from './inventory-filters'
import { InventorySearchBar } from './inventory-search-bar'

export function InventoryProductsTable() {
	const { products, totalProducts, allCategories, allSuppliers } =
		useInventory()
	return (
		<Card className="no-scrollbar relative  h-full flex-grow overflow-y-auto">
			<CardHeader className="sticky top-0 z-10 flex flex-col  gap-4 bg-card px-7">
				<div className="flex w-full items-center justify-between">
					<CardTitle>Registro de productos</CardTitle>
					{products.length > 1 ? (
						<CardDescription>
							Mostrando {products.length} de {totalProducts} artículos
							registrados.
						</CardDescription>
					) : null}
				</div>

				<div className="flex flex-wrap items-center justify-center gap-2 ">
					<InventoryFilters
						categories={allCategories}
						suppliers={allSuppliers}
					/>

					<div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-8 ">
						<InventorySearchBar status="idle" autoSubmit />
						<PaginationBar total={totalProducts} top={25} />
					</div>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-3 sm:gap-1 ">
				{products.map(product => (
					<LinkWithParams
						unstable_viewTransition
						key={product.id}
						prefetch={'intent'}
						className={({ isActive }) =>
							cn(
								'flex flex-row items-center justify-between gap-5 rounded-sm border-2 border-l-8 border-transparent border-b-secondary/30 border-l-secondary/80 p-2 text-sm transition-colors hover:bg-secondary ',
								isActive && 'border-primary/10 bg-secondary',
								!product.isActive && 'border-destructive/20',
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
