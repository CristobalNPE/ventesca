import { useCurrentPendingOrder } from '#app/context/pos/CurrentPendingOrderContext.tsx'
import { useRoveFocus } from '#app/hooks/useRoveFocus.ts'

import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'

import { ScrollArea } from '../ui/scroll-area'
import { ProductOrderRow } from './product-order/product-order-row'
export function CurrentOrderProducts() {
	const { order, globalDiscounts } = useCurrentPendingOrder()
	const allProductOrders = order.productOrders
	const [focus, setFocus] = useRoveFocus(allProductOrders.length ?? 0)
	return (
		<ScrollArea className="relative h-[calc(100%-4rem)]  border-b   ">
			<Table className="">
				<TableHeader className="sticky  top-0 z-20 overflow-clip rounded-md bg-secondary">
					<TableRow>
						<TableHead className="rounded-tl-md">Tipo</TableHead>
						<TableHead className="">Código | Descripción</TableHead>
						<TableHead className="">Precio Unitario</TableHead>
						<TableHead className="text-center">Cantidad</TableHead>
						<TableHead className="">Descuentos</TableHead>
						<TableHead className="text-right">Total</TableHead>
						<TableHead className="rounded-tr-md"></TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{allProductOrders.map((productOrder, index) => (
						<ProductOrderRow
							key={productOrder.id}
							index={index}
							focus={focus === index}
							setFocus={setFocus}
							productOrder={productOrder}
							globalDiscounts={globalDiscounts}
						/>
					))}
				</TableBody>
			</Table>
		</ScrollArea>
	)
}
