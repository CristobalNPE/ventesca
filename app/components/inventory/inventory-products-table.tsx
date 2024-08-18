import { PaginationBar } from '#app/components/pagination-bar.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'

import { useInventory } from '../../context/inventory/InventoryContext'
import { ScrollArea } from '../ui/scroll-area'
import { InventoryFilters } from './inventory-filters'
import { InventorySearchBar } from './inventory-search-bar'

export function InventoryProductsTable() {
	const { products, totalProducts, allCategories, allSuppliers } = useInventory()
	return (
		<Card className="w-full ">
			<CardHeader className="flex flex-col gap-2">
				<div className="flex w-full items-center justify-between">
					<CardTitle>Registro de productos</CardTitle>
					{products.length > 1 && (
						<CardDescription>
							Mostrando {products.length} de {totalProducts} artículos
							registrados.
						</CardDescription>
					)}
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
			{products.length ? (
				<ScrollArea className="relative border-b   p-6 pt-0  sm:h-[calc(100%-14rem)] ">
					<Table>
						<TableHeader className="sticky top-0 z-20 overflow-clip rounded-md bg-secondary">
							<TableRow>
								<TableHead className="rounded-tl-md">Código | Nombre</TableHead>
								<TableHead className="text-center">Categoría</TableHead>
								<TableHead className="text-center">Stock</TableHead>
								<TableHead className="rounded-tr-md text-right">
									Precio de venta
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{products.map((product) => (
								<TableRow className="group" key={product.id}>
									<TableCell className=" h-full overflow-hidden p-0">
										<LinkWithParams
											unstable_viewTransition
											preserveSearch
											prefetch="intent"
											to={product.id}
											className={
												'group/link flex h-full w-full flex-1  items-center justify-between  gap-1 p-4 font-bold transition-all duration-100  group-hover:bg-accent group-hover:text-foreground'
											}
										>
											<div
												className={cn(
													'flex items-center gap-1 overflow-clip  text-nowrap text-left font-semibold ',
													!product.isActive && 'text-destructive',
												)}
											>
												<div className="flex flex-col uppercase">
													<span>{product.name}</span>
													<div className="flex items-center gap-1 text-muted-foreground">
														<Icon name="scan-barcode" className="text-xs" />
														<span>{product.code}</span>
													</div>
												</div>
											</div>
											<Icon
												size="md"
												name="file-arrow-right"
												className="text-foreground opacity-0 transition-all  duration-200 group-hover/link:translate-x-2 group-hover/link:opacity-100 "
											/>
										</LinkWithParams>
									</TableCell>
									<TableCell className="text-center">
										<Badge variant="outline" className="">
											{product.category.name}
										</Badge>
									</TableCell>
									<TableCell className="text-center">
										<div
											className={cn(
												'flex justify-center gap-1 text-nowrap text-sm text-muted-foreground ',
												product.stock === 0 && 'text-destructive',
											)}
										>
											<Icon name="package" />
											<span className="font-semibold">
												{product.stock === 0 ? 'Sin stock' : product.stock}
											</span>
										</div>
									</TableCell>
									<TableCell className="text-right font-bold">
										{formatCurrency(product.sellingPrice)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</ScrollArea>
			) : (
				<div className="flex h-[40rem] w-full flex-col items-center justify-center gap-2 text-balance rounded-sm border border-dashed bg-card text-muted-foreground">
					<Icon name="exclamation-circle" size="xl" />
					<p>No existen productos que cumplan con los filtros aplicados.</p>
				</div>
			)}
		</Card>
	)
}
