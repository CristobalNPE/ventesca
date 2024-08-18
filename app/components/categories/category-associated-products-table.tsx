import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { useCategory } from '#app/context/categories/CategoryContext.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { useSearchParams } from '@remix-run/react'
import { Button } from '../ui/button'
import { LinkWithOrigin } from '../ui/link-origin'

import { useEffect } from 'react'
import { ScrollArea } from '../ui/scroll-area'

export function CategoryAssociatedProductsTable() {
	const { category } = useCategory()
	const [_, setSearchParams] = useSearchParams()

	//We clean up search params when the component is mounted in case we are coming from the inventory page
	useEffect(() => {
		setSearchParams(new URLSearchParams())
	}, [])

	return (
		<Card className="w-full">
			<CardHeader className="flex flex-col gap-2">
				<div className="flex w-full flex-col items-center justify-between gap-2 lg:flex-row">
					<div className="flex flex-col items-center gap-2 lg:items-start">
						<CardTitle>Productos asociados</CardTitle>
						{category.products.length === 1 && (
							<CardDescription>
								Existe {category.products.length} producto asociado a esta
								categoría.
							</CardDescription>
						)}
						{category.products.length !== 1 && (
							<CardDescription>
								Existen {category.products.length} productos asociados a esta
								categoría.
							</CardDescription>
						)}
					</div>
					<Button variant={'secondary'} size={'sm'} asChild>
						<LinkWithOrigin to={`/inventory?category=${category.id}`}>
							<Icon name="package">Gestionar categoría en inventario</Icon>
						</LinkWithOrigin>
					</Button>
				</div>

				<div className="flex flex-wrap items-center justify-center gap-2 ">
					<div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-8 "></div>
				</div>
			</CardHeader>
			{category.products.length ? (
				<ScrollArea className="relative  h-[calc(20rem)]  border-b p-6  pt-0 ">
					{/* <ScrollArea className="relative h-[calc(100%-14rem)]  border-b p-6  pt-0 ">  */}
					<Table>
						<TableHeader className="sticky top-0 z-20 overflow-clip rounded-md bg-secondary">
							<TableRow>
								<TableHead className="rounded-tl-md">Código</TableHead>
								<TableHead className="">Nombre</TableHead>
								<TableHead className="hidden text-center lg:table-cell">
									Stock
								</TableHead>
								<TableHead className="hidden rounded-tr-md text-right lg:table-cell">
									Precio de venta
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{category.products.map((product) => (
								<TableRow className="group" key={product.id}>
									<TableCell className=" h-full overflow-hidden p-0">
										<LinkWithOrigin
											unstable_viewTransition
											preserveSearch
											prefetch="intent"
											to={`/inventory/${product.id}`}
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
										</LinkWithOrigin>
									</TableCell>
									<TableCell>
										<span>{product.name}</span>
									</TableCell>

									<TableCell className="hidden text-center lg:table-cell">
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
									<TableCell className="hidden text-right lg:table-cell">
										{formatCurrency(product.sellingPrice)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</ScrollArea>
			) : (
				<div className="flex w-full flex-col items-center justify-center gap-2 text-balance rounded-sm border border-dashed bg-card p-9 text-muted-foreground">
					<Icon name="exclamation-circle" size="xl" />
					<p>No existen productos registrados en esta categoría.</p>
				</div>
			)}
		</Card>
	)
}
