import { format } from 'date-fns'
import { es } from 'date-fns/locale'
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
import { productOrderTypeBgColors } from '#app/constants/productOrderTypesColors.js'
import { useOrder } from '#app/context/orders/OrderContext.tsx'
import { OrderStatus } from '#app/types/orders/order-status.ts'
import { ProductOrderType } from '#app/types/orders/productOrderType.js'
import { cn, formatCurrency } from '#app/utils/misc.tsx'


import { PaginationBar } from '../pagination-bar'
import { ScrollArea } from '../ui/scroll-area'
import { OrdersFilters } from './orders-filters'


export function OrderProductsTable() {
	const { order } = useOrder()

	return (
		<Card className="w-full">
			<CardHeader className="flex flex-col gap-2">
				<CardTitle>Productos</CardTitle>

				<CardDescription className="h-5">
					Lista de productos asociados a la transacción.
				</CardDescription>
			</CardHeader>
			{order.productOrders.length ? (
				<ScrollArea className="relative h-[calc(100%-14rem)]  border-b p-6  pt-0 ">
					<Table>
						<TableHeader className="sticky  top-0 z-20 overflow-clip rounded-md bg-secondary">
							<TableRow>
								<TableHead className="rounded-tl-md">
									Código | Descripción
								</TableHead>
								<TableHead className="hidden text-center sm:table-cell">
									Cantidad
								</TableHead>
								<TableHead className="hidden text-center sm:table-cell">
									Tipo
								</TableHead>
								<TableHead className="hidden text-right sm:table-cell">
									Descuento
								</TableHead>
								<TableHead className=" rounded-tr-md text-right ">
									Total
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{order.productOrders.map(productOrder => (
								<TableRow className="group" key={productOrder.id}>
									<TableCell className=" h-full overflow-hidden px-2 py-0">
										<div className="flex flex-col ">
											<div className="flex items-center gap-1 text-muted-foreground">
												<Icon name="scan-barcode" />
												<p>{productOrder.productDetails.code}</p>
											</div>
											<p>{productOrder.productDetails.name}</p>
										</div>
									</TableCell>
									<TableCell className="hidden text-center sm:table-cell">
										{productOrder.quantity}
									</TableCell>
									<TableCell className="hidden py-0 text-center sm:table-cell">
										<Badge
											className={cn(
												`${productOrderTypeBgColors[productOrder.type as keyof typeof productOrderTypeBgColors]}`,
											)}
											variant="outline"
										>
											<Icon
												className="mr-1"
												name={
													productOrder.type === ProductOrderType.PROMO
														? 'tag'
														: productOrder.type === ProductOrderType.RETURN
															? 'reset'
															: 'currency-dollar'
												}
											/>
											<span>{productOrder.type}</span>
										</Badge>
									</TableCell>
									<TableCell className="hidden text-right sm:table-cell">
										{formatCurrency(productOrder.totalDiscount)}
									</TableCell>
									<TableCell className=" text-right font-semibold">
										{formatCurrency(productOrder.totalPrice)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</ScrollArea>
			) : (
				<div className="flex h-[28rem] w-full flex-col items-center justify-center gap-2 text-balance rounded-sm border border-dashed bg-card text-muted-foreground">
					<Icon name="exclamation-circle" size="xl" />
					<p>La transacción no contiene productos asociados.</p>
				</div>
			)}
		</Card>
	)
}
