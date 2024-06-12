import {
	type Discount,
	type ItemTransaction as ItemTransactionModel,
} from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { useFetchers } from '@remix-run/react'
import React, { forwardRef, useEffect, useState } from 'react'
import { useSpinDelay } from 'spin-delay'
import { Icon } from '#app/components/ui/icon.tsx'
import { DeleteItemTransaction } from '#app/routes/_system+/item-transaction.delete.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import {
	ItemTransactionType,
	ItemTransactionTypeSchema,
} from '../_types/item-transactionType.ts'
import {
	QuantitySelector,
	UPDATE_IT_QUANTITY,
} from './itemTransaction-quantitySelector.tsx'
import {
	ItemTransactionTypeToggle,
	UPDATE_IT_TYPE,
} from './itemTransaction-typeToggle.tsx'

type CategoryProps = {
	id: string
	name: string
}

export type ItemProps = {
	id: string
	code: number
	name: string
	sellingPrice: number
	stock: number
	discounts: Discount[]
	category: CategoryProps
}

type ItemTransactionRowProps = {
	item: SerializeFrom<ItemProps>
	itemTransaction: SerializeFrom<
		Pick<
			ItemTransactionModel,
			'id' | 'quantity' | 'type' | 'totalPrice' | 'totalDiscount'
		>
	>
	itemReaderRef: React.RefObject<HTMLInputElement>
	globalDiscounts: SerializeFrom<
		Pick<
			Discount,
			| 'id'
			| 'name'
			| 'description'
			| 'applicationMethod'
			| 'type'
			| 'minimumQuantity'
			| 'validFrom'
			| 'validUntil'
			| 'value'
			| 'isActive'
		>
	>[]
}

export const ItemTransaction = forwardRef<
	HTMLDivElement,
	ItemTransactionRowProps
>(({ item, itemTransaction, itemReaderRef, globalDiscounts }, ref) => {
	const [quantity, setQuantity] = useState(itemTransaction.quantity)

	const currentItemTransactionType = ItemTransactionTypeSchema.parse(
		itemTransaction.type,
	)

	const [itemTransactionType, setItemTransactionType] =
		useState<ItemTransactionType>(currentItemTransactionType)

	const itemDiscounts = [
		...item.discounts.filter(discount => quantity >= discount.minimumQuantity),
		...globalDiscounts.filter(discount => quantity >= discount.minimumQuantity),
	]

	const applicableItemDiscounts = itemDiscounts.filter(
		discount => discount.isActive,
	)

	const isAnyItemDiscountApplicable = applicableItemDiscounts.length > 0
	// const isAnyItemDiscountApplicable = itemTransactionDiscounts.some(
	// 	discount => quantity >= discount.minimumQuantity,
	// )
	// Check the status of submissions that modify the item transaction to know when to show the spinner.
	const updateFetchersKeys = [
		`${UPDATE_IT_TYPE}-${itemTransaction.id}`,
		`${UPDATE_IT_QUANTITY}-${itemTransaction.id}`,
	]
	const allFetchers = useFetchers()

	const updateFetchers = allFetchers.filter(fetcher =>
		updateFetchersKeys.includes(fetcher.key),
	)
	const isItemTransactionUpdating = updateFetchers.some(
		fetcher => fetcher.state !== 'idle',
	)
	const showUpdateSpinner = useSpinDelay(isItemTransactionUpdating, {
		delay: 150,
		minDuration: 500,
	})

	const rowRef = ref

	const handleKeyDown = (event: KeyboardEvent) => {
		switch (event.key) {
			case 'ArrowRight':
				event.preventDefault()
				setQuantity(q => (q < item.stock ? q + 1 : q))
				break

			case 'ArrowLeft':
				event.preventDefault()
				setQuantity(q => (q > 1 ? q - 1 : q))
				break
			case 'V':
			case 'v':
				setItemTransactionType(ItemTransactionType.SELL)
				break
			case 'D':
			case 'd':
				setItemTransactionType(ItemTransactionType.RETURN)
				break
			case 'P':
			case 'p':
				event.preventDefault()
				setItemTransactionType(ItemTransactionType.PROMO)
				break
			case 'Enter':
				event.preventDefault()
				itemReaderRef.current?.focus()
				break
		}
	}

	useEffect(() => {
		if (rowRef && typeof rowRef === 'object') {
			const row = rowRef.current
			if (row) {
				row.addEventListener('keydown', handleKeyDown)
			}
			return () => {
				if (row) {
					row.removeEventListener('keydown', handleKeyDown)
				}
			}
		}
		 
	}, [rowRef, item.stock])

	return (
		<ItemTransactionCard
			className={cn(
				'flex flex-col gap-3 sm:flex-row sm:items-center  sm:gap-8  ',
				isItemTransactionUpdating &&
					'pointer-events-none animate-pulse duration-1000',
			)}
			ref={rowRef}
		>
			<div className="min-w-[11rem] flex-1 ">
				<div className="flex w-fit items-center gap-1 rounded-sm bg-muted/70 px-[2px] text-sm  text-muted-foreground">
					<Icon name="scan-barcode" /> <span>{item.code}</span>
				</div>
				<div className="font-bold uppercase">{item.name}</div>
			</div>

			<div className="flex items-center gap-8 ">
				<div className="flex w-[6.5rem] flex-col ">
					<span className="text-xs text-muted-foreground">Precio unitario</span>
					<span className="font-thin">{formatCurrency(item.sellingPrice)}</span>
				</div>
				<QuantitySelector
					min={1}
					max={item.stock}
					quantity={quantity}
					setQuantity={setQuantity}
					itemTransactionId={itemTransaction.id}
				/>
				{itemTransactionType === ItemTransactionType.PROMO ? (
					<div
						className={cn(
							'flex w-[6.5rem]  flex-col text-right text-xs text-muted-foreground',
							isAnyItemDiscountApplicable && 'text-foreground',
						)}
					>
						<span className="text-xs text-muted-foreground">
							Descuentos ({applicableItemDiscounts.length})
						</span>
						<span className="font-thin">
							{formatCurrency(itemTransaction.totalDiscount)}
						</span>
					</div>
				) : (
					<div
						className={cn(
							'flex w-[6.5rem]  flex-col text-right text-xs text-muted-foreground',
							isAnyItemDiscountApplicable && 'text-foreground',
						)}
					>
						{applicableItemDiscounts.length !== 0 && (
							<span className="text-xs text-muted-foreground">
								<span className="font-semibold text-foreground">
									{applicableItemDiscounts.length}
								</span>{' '}
								{applicableItemDiscounts.length === 1
									? 'descuento disponible.'
									: 'descuentos disponibles.'}
							</span>
						)}
					</div>
				)}
				<div className="flex w-[6.5rem]  flex-col text-right">
					<span className="text-xs text-muted-foreground">Total</span>
					<span className="font-bold">
						{formatCurrency(itemTransaction.totalPrice)}
					</span>
				</div>
			</div>
			<ItemTransactionTypeToggle
				itemTransactionId={itemTransaction.id}
				isPromoApplicable={isAnyItemDiscountApplicable}
				itemTransactionType={itemTransactionType}
				setItemTransactionType={setItemTransactionType}
			/>
			<div>
				{showUpdateSpinner ? (
					<div className="h-10 px-4 py-2">
						<Icon name="update" className="animate-spin" />
					</div>
				) : (
					<DeleteItemTransaction id={itemTransaction.id} />
				)}
			</div>
		</ItemTransactionCard>
	)
})
ItemTransaction.displayName = 'ItemTransactionRow'

const ItemTransactionCard = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		tabIndex={0}
		className={cn(
			'relative rounded-md border bg-secondary p-3 shadow-sm outline-none transition-all duration-300 focus:brightness-90 dark:focus:brightness-150',
			className,
		)}
		{...props}
	/>
))
ItemTransactionCard.displayName = 'ItemTransactionCard'
