// import { updateDiscountValidity } from '../_discounts+/discounts_.$discountId.tsx'
import { PaymentMethodPanel } from '#app/components/pos/current-order-payment-method.tsx'
import { useCurrentPendingOrder } from '#app/context/pos/CurrentPendingOrderContext.tsx'

import { PaymentMethod } from '#app/types/orders/payment-method.ts'

import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { type Discount } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { Link } from '@remix-run/react'
import React from 'react'
import { OrderDetailsSchema } from '../../types/orders/OrderData.ts'

import {
	DirectDiscount,
	RemoveDirectDiscount,
} from '../../components/pos/current-order-direct-discount.tsx'
import { DiscardOrder } from '../../components/pos/current-order-discard.tsx'
import { FinishOrder } from '../../components/pos/current-order-finish.tsx'
import { type OrderDetails } from '../../types/orders/OrderData.ts'
import { DiscountSheet } from '#app/routes/_discounts+/discount-sheet.tsx'

export function CurrentOrderSettingsPanel() {
	const { order, availableDiscounts, globalDiscounts } =
		useCurrentPendingOrder()

	const allDiscounts = [...availableDiscounts, ...globalDiscounts]
	return (
		<div className="mx-auto  hidden w-[20rem] flex-col justify-between gap-4 xl:flex">
			<CurrentOrderIdPanel orderId={order.id} />
			<PaymentMethodPanel
				orderId={order.id}
				currentPaymentMethod={order.paymentMethod as PaymentMethod}
			/>
			<DiscountsPanel
				activeDiscounts={allDiscounts}
				orderId={order.id}
				orderTotal={order.total}
				directDiscount={order.directDiscount}
			/>
			<OrderOverviewPanel
				subtotal={order.subtotal}
				discount={order.totalDiscount + order.directDiscount}
				total={order.total}
			/>

			<OrderOptionsPanel order={OrderDetailsSchema.parse(order)} />
		</div>
	)
}

function CurrentOrderIdPanel({ orderId }: { orderId: string }) {
	//?On hover we want to copy the id!
	return (
		<PanelCard>
			<div className="absolute -top-4 w-fit select-none rounded-md border bg-card px-3 py-1 text-xs">
				ID Transacción
			</div>
			<span className="cursor-pointer rounded-md p-1 font-semibold uppercase text-foreground hover:bg-secondary">
				{orderId}
			</span>
		</PanelCard>
	)
}

function OrderOverviewPanel({
	subtotal,
	discount,
	total,
}: {
	subtotal: number
	discount: number
	total: number
}) {
	return (
		<div className="flex flex-col justify-between gap-2 rounded-md bg-muted p-2 ">
			<div className="flex items-center text-xl text-foreground/80">
				<span className="w-[12rem] pl-2">Subtotal:</span>
				<span className="w-[12rem] rounded-md bg-background/50 p-1">
					{formatCurrency(subtotal)}
				</span>
			</div>
			<div className="flex items-center text-xl text-foreground/80">
				<span className="w-[12rem] pl-2">Descuentos:</span>
				<span className="w-[12rem] rounded-md bg-background/50 p-1">
					{formatCurrency(discount)}
				</span>
			</div>
			<div className="flex items-center rounded-md bg-background/20 text-xl font-bold">
				<span className="w-[12rem] pl-2">Total:</span>
				<span className="w-[12rem] rounded-md bg-background/50 p-1">
					{formatCurrency(total)}
				</span>
			</div>
		</div>
	)
}

const DiscountsPanel = ({
	activeDiscounts,
	orderId,
	orderTotal,
	directDiscount,
}: {
	activeDiscounts: SerializeFrom<
		Pick<
			Discount,
			| 'id'
			| 'name'
			| 'description'
			| 'validFrom'
			| 'validUntil'
			| 'applicationMethod'
			| 'type'
			| 'minimumQuantity'
			| 'value'
			| 'scope'
		>
	>[]
	orderId: string
	orderTotal: number
	directDiscount: number
}) => {
	return (
		<div className="relative flex w-full flex-1  flex-col gap-1 rounded-md bg-muted p-2  ">
			{activeDiscounts.length === 0 ? (
				<div className="flex h-full flex-col items-center justify-center gap-2 rounded-md  bg-background/30 p-1">
					<span className="select-none text-lg text-foreground/50">
						Sin promociones aplicables
					</span>
				</div>
			) : (
				<ScrollArea className="flex h-full flex-col  gap-1 rounded-md bg-background/30   text-sm ">
					<div className="text-md sticky top-0 z-40 flex h-[1.5rem] w-[inherit] select-none items-center justify-center bg-background/70 text-center text-foreground/90">
						Promociones aplicables ({activeDiscounts.length})
					</div>
					<ul className="mt-1 flex flex-col font-semibold tracking-tight">
						{activeDiscounts.map(discount => {
							return <DiscountSheet key={discount.id} discount={discount} />
						})}
					</ul>
				</ScrollArea>
			)}

			<div>
				{/* Should render discount dialog or delete discount button depending if there is or not a direct discount assigned */}
				{directDiscount ? (
					<RemoveDirectDiscount
						orderId={orderId}
						directDiscount={directDiscount}
					/>
				) : (
					<DirectDiscount orderId={orderId} orderTotal={orderTotal} />
				)}
			</div>
		</div>
	)
}

const OrderOptionsPanel = ({ order }: { order: OrderDetails }) => {
	return (
		<PanelCard>
			<div className="flex gap-4">
				<GenerateOrderReport orderId={order.id} />
				<DiscardOrder id={order.id} />
			</div>
			<FinishOrder order={order} />
		</PanelCard>
	)
}

const GenerateOrderReport = ({ orderId }: { orderId: string }) => {
	return (
		<Button variant={'outline'} asChild>
			<Link
				target="_blank"
				reloadDocument
				to={`/reports/${orderId}/report-pdf`}
				className="flex aspect-square h-[5.5rem] w-full flex-col items-center justify-center gap-1 text-wrap px-5 text-center"
			>
				<Icon className="flex-none text-2xl" name="report-money" />{' '}
				<span className="leading-tight">Generar Reporte</span>
			</Link>
		</Button>
	)
}

export const PanelCard = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn('relative rounded-md border bg-muted p-2', className)}
		{...props}
	/>
))
PanelCard.displayName = 'PanelCard'
