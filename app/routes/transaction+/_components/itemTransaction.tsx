import { Icon } from '#app/components/ui/icon.tsx'

import { DeleteItemTransaction } from '#app/routes/_system+/item-transaction.delete.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import {
	type Discount,
	type ItemTransaction as ItemTransactionModel,
} from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { useFetchers } from '@remix-run/react'
import React, { forwardRef, useEffect, useState } from 'react'
import { useSpinDelay } from 'spin-delay'
import {
	ItemTransactionType,
	ItemTransactionTypeSchema,
	TYPE_PROMO,
	TYPE_RETURN,
	TYPE_SELL,
} from '../_types/item-transactionType.ts'
import {
	QuantitySelector,
	UPDATE_IT_QUANTITY,
} from './itemTransaction-quantitySelector.tsx'
import {
	ItemTransactionTypeToggle,
	UPDATE_IT_TYPE,
} from './itemTransaction-typeToggle.tsx'

//? it should only allow to change to promo if there are available discounts

type CategoryProps = {
	id: string
	name: string
	discount: Discount | null
}

export type ItemProps = {
	id: string
	code: number
	name: string | null
	sellingPrice: number | null
	stock: number
	discounts: Discount[] 
	category: CategoryProps
}

type ItemTransactionRowProps = {
	item: SerializeFrom<ItemProps>
	itemTransaction: SerializeFrom<
		Pick<ItemTransactionModel, 'id' | 'quantity' | 'type' | 'totalPrice'>
	>
	itemReaderRef: React.RefObject<HTMLInputElement>
}

export const ItemTransaction = forwardRef<
	HTMLDivElement,
	ItemTransactionRowProps
>(({ item, itemTransaction, itemReaderRef }, ref) => {
	// const [totalPrice, setTotalPrice] = useState(item.sellingPrice || 0)
	const totalPrice = itemTransaction.totalPrice
	// const [isFocused, setIsFocused] = useState(false)
	const [quantity, setQuantity] = useState(itemTransaction.quantity)

	const currentItemTransactionType = ItemTransactionTypeSchema.parse(
		itemTransaction.type,
	)

	const [itemTransactionType, setItemTransactionType] =
		useState<ItemTransactionType>(currentItemTransactionType)

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
	/////////////////////////////////

	// function hasMinQuantity(
	// 	discount: SerializeFrom<Discount> | null | undefined,
	// ): discount is SerializeFrom<Discount> {
	// 	return discount?.minQuantity !== undefined
	// }

	// function isValidDiscount(
	// 	discount: SerializeFrom<Discount> | null | undefined,
	// ): discount is SerializeFrom<Discount> {
	// 	return (
	// 		hasMinQuantity(discount) &&
	// 		discount.minQuantity <= itemTransaction.quantity
	// 	)
	// }

	const isItemDiscountApplicable = false
		// Boolean(item.discount) &&
		// isValidDiscount(item.discount) &&
		// isDiscountActive(item.discount)

	// const isFamilyDiscountApplicable =
	// 	Boolean(item.category.discount) &&
	// 	isValidDiscount(item.category.discount) &&
	// 	isDiscountActive(item.category.discount)

	// function calculateDiscounts() {
	// 	if (!isItemDiscountApplicable) return { familyDiscount: 0, itemDiscount: 0 }

	// 	const categoryDiscount = item.category.discount
	// 	// const itemDiscount = item.discount
	// 	const sellingPrice = item.sellingPrice ?? 0

	// 	let totalCategoryDiscount = 0
	// 	let totalItemDiscount = 0

	// 	if (categoryDiscount) {
	// 		totalCategoryDiscount = calculateDiscount(
	// 			categoryDiscount,
	// 			sellingPrice,
	// 			quantity,
	// 		)
	// 	}

	// 	if (itemDiscount) {
	// 		totalItemDiscount = calculateDiscount(
	// 			itemDiscount,
	// 			sellingPrice,
	// 			quantity,
	// 		)
	// 	}

	// 	return {
	// 		categoryDiscount: totalCategoryDiscount,
	// 		itemDiscount: totalItemDiscount,
	// 	}
	// }

	// const { itemDiscount } = calculateDiscounts() ?? {}

	// const applicableItemDiscounts = isItemDiscountApplicable
	// 	? itemDiscount ?? 0
	// 	: 0
	// const totalDiscounts =
	// 	itemTransactionType === TYPE_PROMO ? applicableItemDiscounts : 0

	// useEffect(() => {
	// 	if (transactionType === TYPE_RETURN && totalPrice > 0) {
	// 		setTotalPrice(totalPrice * -1)
	// 	}
	// 	if (transactionType !== TYPE_RETURN && totalPrice < 0) {
	// 		setTotalPrice(totalPrice * -1)
	// 	}
	// }, [transactionType, totalPrice])

	// const fetcherKey = `it-${itemTransaction.id}`

	// const fetcher = useFetcher({ key: fetcherKey })
	// const isLoading = fetcher.state !== 'idle'

	// const quantityChanged = itemTransaction.quantity !== quantity
	// const typeChanged = itemTransaction.type !== transactionType




	//! TAKE A LOOK FOR DISCOUNTS
	// useEffect(() => {
	// 	if (item.sellingPrice && transactionType === TYPE_SELL) {
	// 		setTotalPrice(item.sellingPrice * quantity)
	// 	}

	// 	if (item.sellingPrice && transactionType === TYPE_PROMO) {
	// 		let priceAfterDiscounts = item.sellingPrice * quantity
	// 		if (isFamilyDiscountApplicable) {
	// 			priceAfterDiscounts = priceAfterDiscounts - familyDiscount!
	// 		}

	// 		if (isItemDiscountApplicable) {
	// 			priceAfterDiscounts = priceAfterDiscounts - itemDiscount!
	// 		}
	// 		setTotalPrice(priceAfterDiscounts)
	// 	}
	// }, [quantity, item.sellingPrice, transactionType])

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
				setItemTransactionType(TYPE_SELL)
				break
			case 'D':
			case 'd':
				setItemTransactionType(TYPE_RETURN)
				break
			case 'P':
			case 'p':
				event.preventDefault()
				setItemTransactionType(TYPE_PROMO)
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rowRef, item.stock])

	return (
		<ItemTransactionCard
			className={cn(
				'flex flex-col gap-3 sm:flex-row sm:items-center  sm:gap-8',
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
					<span>{formatCurrency(item.sellingPrice)}</span>
				</div>
				<QuantitySelector
					min={1}
					max={item.stock}
					quantity={quantity}
					setQuantity={setQuantity}
					itemTransactionId={itemTransaction.id}
				/>
				<div className="flex w-[6.5rem]  flex-col text-right">
					<span className="text-xs text-muted-foreground">Total</span>
					<span className="font-bold">{formatCurrency(totalPrice)}</span>
				</div>
			</div>
			<ItemTransactionTypeToggle
				itemTransactionId={itemTransaction.id}
				isPromoApplicable={isItemDiscountApplicable}
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

// const calculateDiscount = (
// 	discount: SerializeFrom<Discount>,
// 	itemPrice: number,
// 	quantity: number,
// ) => {
// 	if (discount.target === DISCOUNT_TARGET_UNIT) {
// 		if (discount.type === DISCOUNT_TYPE_FIXED) {
// 			return discount.value * quantity
// 		}
// 		if (discount.type === DISCOUNT_TYPE_PERCENTAGE) {
// 			return ((itemPrice * discount.value) / 100) * quantity
// 		}
// 	}
// 	if (discount.target === DISCOUNT_TARGET_TOTAL) {
// 		if (discount.type === DISCOUNT_TYPE_FIXED) {
// 			return discount.value
// 		}
// 		if (discount.type === DISCOUNT_TYPE_PERCENTAGE) {
// 			return (itemPrice * quantity * discount.value) / 100
// 		}
// 	}
// 	return 0
// }

const ItemTransactionCard = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		tabIndex={0}
		className={cn(
			'relative rounded-md bg-card p-3 shadow-sm outline-none transition-all duration-300 focus:brightness-90 dark:focus:brightness-150',
			className,
		)}
		{...props}
	/>
))
ItemTransactionCard.displayName = 'ItemTransactionCard'
