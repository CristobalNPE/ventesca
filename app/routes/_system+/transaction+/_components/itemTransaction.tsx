import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import {
	DISCOUNT_TARGET_TOTAL,
	DISCOUNT_TARGET_UNIT,
	DISCOUNT_TYPE_FIXED,
	DISCOUNT_TYPE_PERCENTAGE,
} from '#app/routes/_system+/discounts_+/index.tsx'
import { DeleteItemTransaction } from '#app/routes/_system+/item-transaction.delete.tsx'
import { isDiscountActive } from '#app/routes/_system+/transaction+/index.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import {
	type Discount,
	type ItemTransaction as ItemTransactionModel,
} from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import React, { forwardRef, useEffect, useRef, useState } from 'react'
import {
	ItemTransactionType,
	TYPE_PROMO,
	TYPE_RETURN,
	TYPE_SELL,
} from '../_types/item-transactionType.ts'
import { ItemTransactionTypeToggle } from './itemTransaction-typeToggle.tsx'

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
	discount: Discount | null
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
	HTMLTableRowElement,
	ItemTransactionRowProps
>(({ item, itemTransaction, itemReaderRef }, ref) => {
	const [totalPrice, setTotalPrice] = useState(item.sellingPrice || 0)
	const [isFocused, setIsFocused] = useState(false)
	const [quantity, setQuantity] = useState(itemTransaction.quantity)
	// const [transactionType, setTransactionType] = useState<ItemTransactionType>(
	// 	itemTransaction.type as ItemTransactionType,
	// )

	const transactionType = itemTransaction.type

	function hasMinQuantity(
		discount: SerializeFrom<Discount> | null | undefined,
	): discount is SerializeFrom<Discount> {
		return discount?.minQuantity !== undefined
	}

	function isValidDiscount(
		discount: SerializeFrom<Discount> | null | undefined,
	): discount is SerializeFrom<Discount> {
		return (
			hasMinQuantity(discount) &&
			discount.minQuantity <= itemTransaction.quantity
		)
	}

	const isItemDiscountApplicable =
		Boolean(item.discount) &&
		isValidDiscount(item.discount) &&
		isDiscountActive(item.discount)

	const isFamilyDiscountApplicable =
		Boolean(item.category.discount) &&
		isValidDiscount(item.category.discount) &&
		isDiscountActive(item.category.discount)

	const isAnyDiscountApplicable =
		isItemDiscountApplicable || isFamilyDiscountApplicable

	function calculateDiscounts() {
		if (!isAnyDiscountApplicable) return { familyDiscount: 0, itemDiscount: 0 }

		const categoryDiscount = item.category.discount
		const itemDiscount = item.discount
		const sellingPrice = item.sellingPrice ?? 0

		let totalCategoryDiscount = 0
		let totalItemDiscount = 0

		if (categoryDiscount) {
			totalCategoryDiscount = calculateDiscount(
				categoryDiscount,
				sellingPrice,
				quantity,
			)
		}

		if (itemDiscount) {
			totalItemDiscount = calculateDiscount(
				itemDiscount,
				sellingPrice,
				quantity,
			)
		}

		return {
			categoryDiscount: totalCategoryDiscount,
			itemDiscount: totalItemDiscount,
		}
	}

	const { familyDiscount, itemDiscount } = calculateDiscounts() ?? {}

	const applicableCategoryDiscounts = isFamilyDiscountApplicable
		? familyDiscount ?? 0
		: 0
	const applicableItemDiscounts = isItemDiscountApplicable
		? itemDiscount ?? 0
		: 0
	const totalDiscounts =
		transactionType === TYPE_PROMO
			? applicableCategoryDiscounts + applicableItemDiscounts
			: 0

	useEffect(() => {
		if (transactionType === TYPE_RETURN && totalPrice > 0) {
			setTotalPrice(totalPrice * -1)
		}
		if (transactionType !== TYPE_RETURN && totalPrice < 0) {
			setTotalPrice(totalPrice * -1)
		}
	}, [transactionType, totalPrice])

	const fetcherKey = `it-${itemTransaction.id}`

	const fetcher = useFetcher({ key: fetcherKey })
	const isLoading = fetcher.state !== 'idle'

	const quantityChanged = itemTransaction.quantity !== quantity
	const typeChanged = itemTransaction.type !== transactionType

	const formData = new FormData()
	formData.append('it-id', itemTransaction.id)
	formData.append('it-vpd', transactionType)
	formData.append('it-quantity', quantity.toString())
	formData.append('it-total-price', totalPrice.toString())
	formData.append('it-total-discount', totalDiscounts.toString())

	const submitForm = () => {
		if (isLoading) return
		if (!quantityChanged && !typeChanged) return

		fetcher.submit(formData, {
			method: 'POST',
			action: '/item-transaction/edit',
		})
	}

	useEffect(() => {
		if (item.sellingPrice && transactionType === TYPE_SELL) {
			setTotalPrice(item.sellingPrice * quantity)
		}

		if (item.sellingPrice && transactionType === TYPE_PROMO) {
			let priceAfterDiscounts = item.sellingPrice * quantity
			if (isFamilyDiscountApplicable) {
				priceAfterDiscounts = priceAfterDiscounts - familyDiscount!
			}

			if (isItemDiscountApplicable) {
				priceAfterDiscounts = priceAfterDiscounts - itemDiscount!
			}
			setTotalPrice(priceAfterDiscounts)
		}
	}, [quantity, item.sellingPrice, transactionType])

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
			// case 'V':
			// case 'v':
			// 	setTransactionType(TYPE_SELL)
			// 	break
			// case 'D':
			// case 'd':
			// 	setTransactionType(TYPE_RETURN)
			// 	break
			// case 'P':
			// case 'p':
			// 	event.preventDefault()
			// 	setTransactionType(TYPE_PROMO)
			// 	break
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
		<ItemTransactionCard className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
			<div className="min-w-[11rem] flex-1">
				<div className="flex w-fit items-center gap-1 rounded-sm bg-muted/70 px-[2px] text-sm  text-muted-foreground">
					<Icon name="scan-barcode" /> <span>{item.code}</span>
				</div>
				<div className="font-bold uppercase">{item.name}</div>
			</div>

			<div className="flex flex-col items-center gap-3 sm:flex-row">
				<div className="flex w-[6.5rem] flex-col">
					<span className="text-xs text-muted-foreground">Precio unitario</span>
					<span>{formatCurrency(item.sellingPrice)}</span>
				</div>
				<QuantitySelector
					min={1}
					max={item.stock}
					quantity={quantity}
					setQuantity={setQuantity}
				/>
				<div className="flex w-[6.5rem]  flex-col text-right">
					<span className="text-xs text-muted-foreground">Total</span>
					<span className="font-bold">{formatCurrency(totalPrice)}</span>
				</div>
			</div>
			<ItemTransactionTypeToggle
				itemTransactionId={itemTransaction.id}
				isPromoApplicable={isAnyDiscountApplicable}
				currentItemTransactionType={itemTransaction.type as ItemTransactionType}
				cardRef={ref}
			/>
			<div>
				<DeleteItemTransaction id={itemTransaction.id} />
			</div>
		</ItemTransactionCard>
	)
})
ItemTransaction.displayName = 'ItemTransactionRow'

const QuantitySelector = ({
	min,
	max,
	quantity,
	setQuantity,
}: {
	min: number
	max: number
	quantity: number
	setQuantity: (value: number) => void
}) => {
	const componentRef = useRef<HTMLDivElement>(null)

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = parseInt(event.target.value, 10)
		if (!isNaN(newValue) && newValue >= min && newValue <= max) {
			setQuantity(newValue)
		}
	}

	const increaseValue = () => {
		const newValue = quantity < max ? quantity + 1 : quantity
		setQuantity(newValue)
	}

	const decreaseValue = () => {
		const newValue = quantity > min ? quantity - 1 : quantity
		setQuantity(newValue)
	}

	return (
		<div ref={componentRef} className="flex rounded-sm border">
			<Button
				tabIndex={-1}
				variant={'ghost'}
				className="aspect-square h-[1.6rem] w-[2rem] rounded-sm p-0"
				onClick={decreaseValue}
				disabled={quantity <= min}
			>
				<Icon size="lg" name="minus" />
			</Button>
			<Input
				className="h-[1.6rem] w-[3rem] border-none p-0 text-center [&::-webkit-inner-spin-button]:appearance-none"
				tabIndex={-1}
				type="number"
				value={quantity}
				onChange={handleInputChange}
			/>
			<Button
				tabIndex={-1}
				variant={'ghost'}
				className="aspect-square h-[1.6rem] w-[2rem] rounded-sm p-0"
				onClick={increaseValue}
				disabled={quantity >= max}
			>
				<Icon size="lg" name="plus" />
			</Button>
		</div>
	)
}

const calculateDiscount = (
	discount: SerializeFrom<Discount>,
	itemPrice: number,
	quantity: number,
) => {
	if (discount.target === DISCOUNT_TARGET_UNIT) {
		if (discount.type === DISCOUNT_TYPE_FIXED) {
			return discount.value * quantity
		}
		if (discount.type === DISCOUNT_TYPE_PERCENTAGE) {
			return ((itemPrice * discount.value) / 100) * quantity
		}
	}
	if (discount.target === DISCOUNT_TARGET_TOTAL) {
		if (discount.type === DISCOUNT_TYPE_FIXED) {
			return discount.value
		}
		if (discount.type === DISCOUNT_TYPE_PERCENTAGE) {
			return (itemPrice * quantity * discount.value) / 100
		}
	}
	return 0
}

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
