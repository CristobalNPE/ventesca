import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { Discount } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Link } from '@remix-run/react'
import React from 'react'
import { DiscountSheet } from '../_discounts+/discount-sheet.tsx'

import { TransactionDetails } from './_types/TransactionData.ts'
import { DirectDiscount, RemoveDirectDiscount } from './__direct-discount.tsx'
import { DiscardTransaction } from './__discard-transaction.tsx'
import { FinishTransaction } from './__finish-transaction.tsx'

export function TransactionIdPanel({
	transactionId,
}: {
	transactionId: string
}) {
	return (
		<PanelCard>
			<div className="absolute -top-4 w-fit select-none rounded-md bg-card px-3 py-1 text-xs">
				ID Transacción
			</div>
			<span className="cursor-pointer rounded-md p-1 font-semibold uppercase text-foreground hover:bg-secondary">
				{transactionId}
			</span>
		</PanelCard>
	)
}

export function TransactionOverviewPanel({
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

export const DiscountsPanel = ({
	activeDiscounts,
	transactionId,
	transactionTotal,
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
	transactionId: string
	transactionTotal: number
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
						transactionId={transactionId}
						directDiscount={directDiscount}
					/>
				) : (
					<DirectDiscount
						transactionId={transactionId}
						transactionTotal={transactionTotal}
					/>
				)}
			</div>
		</div>
	)
}

export const TransactionOptionsPanel = ({
	transaction,
}: {
	transaction: TransactionDetails
}) => {
	return (
		<PanelCard>
			<div className="flex gap-4">
				<GenerateTransactionReport transactionId={transaction.id} />
				<DiscardTransaction id={transaction.id} />
			</div>
			<FinishTransaction transaction={transaction} />
		</PanelCard>
	)
}

const GenerateTransactionReport = ({
	transactionId,
}: {
	transactionId: string
}) => {
	return (
		<Button variant={'outline'} asChild>
			<Link
				target="_blank"
				reloadDocument
				to={`/reports/${transactionId}/report-pdf`}
				className="flex aspect-square h-[5.5rem] w-full flex-col items-center justify-center gap-1 px-5 text-center text-wrap"
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
		className={cn('relative rounded-md bg-muted p-2', className)}
		{...props}
	/>
))
PanelCard.displayName = 'PanelCard'
