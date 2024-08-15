// import { updateDiscountValidity } from '../_discounts+/discounts_.$discountId.tsx'


import { type Discount } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { Link, useNavigate } from '@remix-run/react'
import React from 'react'

import { type OrderDetails } from '#app/types/orders/OrderData.ts'
import { toast } from 'sonner'
import { PaymentMethodPanel } from '#app/components/pos/current-order-payment-method.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import { useCurrentPendingOrder } from '#app/context/pos/CurrentPendingOrderContext.tsx'
import { useResponsive } from '#app/hooks/useResponsive.ts'
import { DiscountSheet } from '#app/routes/_discounts+/discount-sheet.tsx'
import { type PaymentMethod } from '#app/types/orders/payment-method.ts'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import {
	DirectDiscount,
	RemoveDirectDiscount,
} from '../../components/pos/current-order-direct-discount.tsx'
import { DiscardOrder } from '../../components/pos/current-order-discard.tsx'
import { OrderDetailsSchema } from '../../types/orders/OrderData.ts'
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet.tsx'

export function CurrentOrderSettingsPanel() {
	return (
		<>
			{/* Desktop */}
			<div className="mx-auto  hidden w-[20rem] flex-col justify-between gap-4 xl:flex">
				<CurrentOrderSettingsPanelContent />
			</div>

			{/* Mobile */}
			<Sheet modal={false}>
				<SheetTrigger asChild>
					<Button className="absolute right-2 top-1/2 flex h-24 w-7 -translate-y-1/2 p-1 transition-all hover:h-32 xl:hidden">
						<Icon name="double-arrow-left" className="shrink-0" size="sm" />
					</Button>
				</SheetTrigger>
				<SheetContent className="flex flex-col">
					<CurrentOrderSettingsPanelContent />
				</SheetContent>
			</Sheet>
		</>
	)
}

function CurrentOrderSettingsPanelContent() {
	const { order, availableDiscounts, globalDiscounts } =
		useCurrentPendingOrder()

	const allDiscounts = [...availableDiscounts, ...globalDiscounts]
	return (
		<>
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
		</>
	)
}

function CurrentOrderIdPanel({ orderId }: { orderId: string }) {
	return (
		<PanelCard className="group flex items-center justify-between">
			<div className="absolute -top-4 w-fit select-none rounded-md border bg-card px-3 py-1 text-xs">
				ID Transacción
			</div>
			<div
				onClick={() => {
					navigator.clipboard.writeText(orderId)
					toast.success('ID copiado al portapapeles')
				}}
				className="cursor-pointer rounded-md p-1 font-semibold uppercase text-foreground hover:bg-secondary"
			>
				{orderId}
			</div>
			<Icon
				name="copy"
				size="sm"
				className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
			/>
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
		<div className="flex flex-col justify-between gap-2 rounded-md border bg-muted p-2">
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
		<div className="relative flex w-full flex-1 flex-col  gap-1 rounded-md border bg-muted p-2  ">
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
	const navigate = useNavigate()

	return (
		<PanelCard className="flex flex-col gap-2">
			<DiscardOrder id={order.id} />
			<Button
				size={'wide'}
				className="group flex h-[3.5rem] items-center gap-2 text-lg font-semibold"
				disabled={order.productOrders.length === 0}
				onClick={() => {
					navigate(`/orders/${order.id}`, {
						unstable_viewTransition: true,
						state: { origin: 'pos' },
					})
				}}
			>
				Ingresar Transacción
				<Icon
					name="double-arrow-right"
					size="md"
					className="shrink-0 transition-transform group-hover:translate-x-2"
				/>
			</Button>
		</PanelCard>
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
