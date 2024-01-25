import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { TableCell, TableRow } from '#app/components/ui/table.tsx'
import {
	DISCOUNT_TARGET_TOTAL,
	DISCOUNT_TARGET_UNIT,
	DISCOUNT_TYPE_FIXED,
	DISCOUNT_TYPE_PERCENTAGE,
} from '#app/routes/_system+/discounts_+/index.tsx'
import { DeleteItemTransaction } from '#app/routes/_system+/item-transaction.delete.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { Discount, type ItemTransaction } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { Link, useFetcher } from '@remix-run/react'
import { forwardRef, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from './ui/dropdown-menu.tsx'

export const TYPE_SELL = 'Venta'
export const TYPE_RETURN = 'Devolución'
export const TYPE_PROMO = 'Promoción'

const itemTransactionTypes = [TYPE_SELL, TYPE_RETURN, TYPE_PROMO] as const
export const ItemTransactionTypeSchema = z.enum(itemTransactionTypes)
export type ItemTransactionType = z.infer<typeof ItemTransactionTypeSchema>

//? it should only allow to change to promo if there are available discounts

type FamilyProps = {
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
	family: FamilyProps
}

type ItemTransactionRowProps = {
	item: SerializeFrom<ItemProps>
	itemTransaction: SerializeFrom<
		Pick<ItemTransaction, 'id' | 'quantity' | 'type' | 'totalPrice'>
	>
	itemReaderRef: React.RefObject<HTMLInputElement>
}

export const ItemTransactionRow = forwardRef<
	HTMLTableRowElement,
	ItemTransactionRowProps
>(({ item, itemTransaction, itemReaderRef }, ref) => {
	const [totalPrice, setTotalPrice] = useState(item.sellingPrice || 0)
	const [isFocused, setIsFocused] = useState(false)
	const [quantity, setQuantity] = useState(itemTransaction.quantity)
	const [transactionType, setTransactionType] = useState<ItemTransactionType>(
		itemTransaction.type as ItemTransactionType,
	)

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
		Boolean(item.discount) && isValidDiscount(item.discount)

	const isFamilyDiscountApplicable =
		Boolean(item.family?.discount) && isValidDiscount(item.family?.discount)

	const isAnyDiscountApplicable =
		isItemDiscountApplicable || isFamilyDiscountApplicable

	function calculateDiscounts() {
		if (!isAnyDiscountApplicable) return { familyDiscount: 0, itemDiscount: 0 }

		const familyDiscount = item.family?.discount
		const itemDiscount = item.discount
		const sellingPrice = item.sellingPrice ?? 0

		let totalFamilyDiscount = 0
		let totalItemDiscount = 0

		if (familyDiscount) {
			totalFamilyDiscount = calculateDiscount(
				familyDiscount,
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
			familyDiscount: totalFamilyDiscount,
			itemDiscount: totalItemDiscount,
		}
	}

	const { familyDiscount, itemDiscount } = calculateDiscounts() ?? {}

	const applicableFamilyDiscounts = isFamilyDiscountApplicable
		? familyDiscount ?? 0
		: 0
	const applicableItemDiscounts = isItemDiscountApplicable
		? itemDiscount ?? 0
		: 0
	const totalDiscounts =
		transactionType === TYPE_PROMO
			? applicableFamilyDiscounts + applicableItemDiscounts
			: 0

	useEffect(() => {
		if (transactionType === TYPE_PROMO && !isAnyDiscountApplicable) {
			setTransactionType(TYPE_SELL)
		}
	}, [isAnyDiscountApplicable, transactionType])

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
			case 'V':
			case 'v':
				setTransactionType(TYPE_SELL)
				break
			case 'D':
			case 'd':
				setTransactionType(TYPE_RETURN)
				break
			case 'P':
			case 'p':
				event.preventDefault()
				setTransactionType(TYPE_PROMO)
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
		<>
			{/* <div className="flex gap-4">
				<div className="text-xs">
					{isAnyDiscountApplicable && (
						<div className="flex flex-col">
							{isItemDiscountApplicable && (
								<div className="flex  gap-2">
									<p>{item.discount?.value}</p>
									<p>{calculateDiscounts()?.itemDiscount}</p>
								</div>
							)}
							{isFamilyDiscountApplicable && (
								<div className="flex  gap-2">
									<p>{item.family.discount?.value}</p>
									<p>{calculateDiscounts()?.familyDiscount}</p>
								</div>
							)}
						</div>
					)}
					<p className="text-destructive">${totalDiscounts}</p>
				</div>
			</div> */}
			<TableRow
				ref={rowRef}
				className={cn(
					'uppercase ',
					isFocused && 'scale-[1.01] bg-primary/10 hover:bg-primary/10 ',
					isLoading && 'pointer-events-none opacity-30 ',
				)}
				tabIndex={0}
				onBlur={() => {
					setIsFocused(false)
					submitForm()
				}}
				onFocus={() => setIsFocused(true)}
			>
				<TableCell className="flex items-center justify-center">
					{isLoading ? (
						<Icon
							size="md"
							className="relative bottom-0 left-2 animate-spin blur-0"
							name="circle-dot-dashed"
						/>
					) : (
						<ItemTransactionRowActions
							itemId={item.id}
							itemTransactionId={itemTransaction.id}
						/>
					)}
				</TableCell>
				<TableCell className="font-bold">{item.code}</TableCell>
				<TableCell className="font-medium">
					<TransactionType
						isPromoApplicable={isAnyDiscountApplicable}
						initialType={transactionType}
						setType={setTransactionType}
					/>
				</TableCell>
				<TableCell className="font-medium tracking-wider">
					{item.name}
				</TableCell>
				<TableCell className="font-medium">
					{formatCurrency(item.sellingPrice)}
				</TableCell>
				<TableCell>
					<QuantitySelector
						min={1}
						max={item.stock}
						quantity={quantity}
						setQuantity={setQuantity}
					/>
				</TableCell>
				<TableCell className="text-right font-bold">
					{formatCurrency(totalPrice)}
				</TableCell>
			</TableRow>
		</>
	)
})
ItemTransactionRow.displayName = 'ItemTransactionRow'

const TransactionType = ({
	initialType,
	setType,
	isPromoApplicable,
}: {
	initialType: ItemTransactionType
	setType: (value: ItemTransactionType) => void
	isPromoApplicable: boolean
}) => {
	const componentRef = useRef<HTMLDivElement>(null)

	const cycleState = () => {
		let nextState: ItemTransactionType

		if (initialType === TYPE_SELL) {
			nextState = TYPE_RETURN
		} else if (initialType === TYPE_RETURN) {
			nextState = isPromoApplicable ? TYPE_PROMO : TYPE_SELL
		} else {
			nextState = isPromoApplicable ? TYPE_SELL : TYPE_RETURN
		}

		setType(nextState)
	}

	return (
		<div
			className={cn(
				'flex w-[4rem] cursor-pointer select-none items-center justify-center rounded-md text-xs font-bold uppercase tracking-wider text-background',
				initialType === TYPE_SELL && 'bg-primary/80',
				initialType === TYPE_RETURN && 'bg-orange-500/80',
				initialType === TYPE_PROMO && 'bg-blue-500/80',
			)}
			onClick={cycleState}
			tabIndex={-1}
			ref={componentRef}
		>
			{initialType.substring(0, 5)}
		</div>
	)
}

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
		<div ref={componentRef} className="flex">
			<Button
				tabIndex={-1}
				variant={'ghost'}
				className="aspect-square h-[1.6rem] w-[2rem] p-0"
				onClick={decreaseValue}
				disabled={quantity <= min}
			>
				<Icon size="lg" name="minus" />
			</Button>
			<Input
				className="h-[1.6rem] w-[3rem] p-0 text-center [&::-webkit-inner-spin-button]:appearance-none"
				tabIndex={-1}
				type="number"
				value={quantity}
				onChange={handleInputChange}
			/>
			<Button
				tabIndex={-1}
				variant={'ghost'}
				className="aspect-square h-[1.6rem] w-[2rem] p-0"
				onClick={increaseValue}
				disabled={quantity >= max}
			>
				<Icon size="lg" name="plus" />
			</Button>
		</div>
	)
}

const ItemTransactionRowActions = ({
	itemTransactionId,
	itemId,
}: {
	itemTransactionId: string
	itemId: string
}) => {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				asChild
				tabIndex={-1}
				className="focus-within:ring-0  focus-visible:ring-0"
			>
				<Button
					tabIndex={-1}
					variant={'link'}
					className="relative left-2 top-2 h-1 w-5 p-0   focus-within:ring-0  focus-visible:ring-0"
				>
					<Icon size="lg" name="dots-vertical" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="flex flex-col gap-2">
				<DeleteItemTransaction id={itemTransactionId} />
				<Button asChild variant={'outline'}>
					<Link to={`/inventory/${itemId}`}>
						<Icon className="mr-2" name="file-text" />
						Detalles
					</Link>
				</Button>
			</DropdownMenuContent>
		</DropdownMenu>
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
