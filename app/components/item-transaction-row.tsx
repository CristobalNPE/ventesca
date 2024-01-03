import { type Item, type ItemTransaction } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { Link, useFetcher, useSubmit } from '@remix-run/react'

import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { TableCell, TableRow } from '#app/components/ui/table.tsx'
import { DeleteItemTransaction } from '#app/routes/system+/item-transaction.delete.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { forwardRef, useEffect, useRef, useState } from 'react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from './ui/dropdown-menu.tsx'

export const TYPE_SELL = 'VENTA'
export const TYPE_RETURN = 'DEVOL' //Returns subtract their price instead of adding it.
export const TYPE_PROMO = 'PROMO' //User is shown available discounts in sell panel. If he wants to apply them he must change the transaction type to promo
//? it should only allow to change to promo if there are available discounts

type ItemTransactionRowProps = {
	item: SerializeFrom<
		Pick<Item, 'id' | 'code' | 'name' | 'sellingPrice' | 'stock'>
	>
	itemTransaction: SerializeFrom<
		Pick<ItemTransaction, 'id' | 'quantity' | 'type' | 'totalPrice'>
	>
	itemReaderRef: React.RefObject<HTMLInputElement>
	onArrowKeyPress: (
		key: 'ArrowUp' | 'ArrowDown',
		itemTransactionId: string,
	) => void
}

export const ItemTransactionRow = forwardRef<
	HTMLTableRowElement,
	ItemTransactionRowProps
>(({ item, itemTransaction, itemReaderRef, onArrowKeyPress }, ref) => {
	const [totalPrice, setTotalPrice] = useState(item.sellingPrice || 0)
	const [isFocused, setIsFocused] = useState(false)
	const [quantity, setQuantity] = useState(itemTransaction.quantity)
	const [transactionType, setTransactionType] = useState<StateType>(
		itemTransaction.type as StateType,
	)

	useEffect(() => {
		if (transactionType === TYPE_RETURN && totalPrice > 0) {
			setTotalPrice(totalPrice * -1)
		}
		if (transactionType !== TYPE_RETURN && totalPrice < 0) {
			setTotalPrice(totalPrice * -1)
		}
	}, [transactionType, totalPrice])

	const fetcherKey = `it-${itemTransaction.id}`
	const submit = useSubmit()
	const fetcher = useFetcher({ key: fetcherKey })
	const isLoading = fetcher.state !== 'idle'

	// const handleFormChange = useDebounce((form: HTMLFormElement) => {
	// 	submit(form)
	// }, 400) //May need to use this if there are errors when posting?
	const formRef = useRef<HTMLFormElement>(null)

	const quantityChanged = itemTransaction.quantity !== quantity
	const typeChanged = itemTransaction.type !== transactionType

	const submitForm = () => {
		if (isLoading) return
		if (!quantityChanged && !typeChanged) return
		if (formRef.current) {
			submit(formRef.current, {
				navigate: false,
				fetcherKey: fetcherKey,
			})
		}
	}

	useEffect(() => {
		if (item.sellingPrice) {
			setTotalPrice(item.sellingPrice * quantity)
		}
	}, [quantity, item.sellingPrice])

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
				setTransactionType(TYPE_PROMO)
				break
			case 'Enter':
				event.preventDefault()
				itemReaderRef.current?.focus()
				break
			case 'ArrowUp':
			case 'ArrowDown':
				event.preventDefault()
				onArrowKeyPress(event.key, itemTransaction.id)
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
		<>
			<fetcher.Form
				ref={formRef}
				method="POST"
				action="/system/item-transaction/edit"
			>
				<input type="hidden" name="it-id" value={itemTransaction.id} />
				<input type="hidden" name="it-vpd" value={transactionType} />
				<input type="hidden" name="it-quantity" value={quantity} />
				<input type="hidden" name="it-total-price" value={totalPrice} />
			</fetcher.Form>
			<TableRow
				ref={rowRef}
				className={cn(
					'uppercase ',
					isFocused && 'bg-primary/10 hover:bg-primary/10',
					isLoading && 'pointer-events-none opacity-30',
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

export type StateType =
	| typeof TYPE_SELL
	| typeof TYPE_RETURN
	| typeof TYPE_PROMO

const TransactionType = ({
	initialType,
	setType,
}: {
	initialType: StateType
	setType: (value: StateType) => void
}) => {
	const componentRef = useRef<HTMLDivElement>(null)

	const cycleState = () => {
		const nextState =
			initialType === TYPE_SELL
				? TYPE_RETURN
				: initialType === TYPE_RETURN
				  ? TYPE_PROMO
				  : TYPE_SELL
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
			{initialType}
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
					<Link to={`/system/inventory/${itemId}`}>
						<Icon className="mr-2" name="file-text" />
						Detalles
					</Link>
				</Button>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
