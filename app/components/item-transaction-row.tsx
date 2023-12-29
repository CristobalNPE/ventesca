import { type Item, type ItemTransaction } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { useFetcher, useSubmit } from '@remix-run/react'

import { useEffect, useRef, useState } from 'react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { TableCell, TableRow } from '#app/components/ui/table.tsx'
import { DeleteItemTransaction } from '#app/routes/system+/item-transaction.delete.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'

export const ItemTransactionRow = ({
	item,
	itemTransaction,
}: {
	item: SerializeFrom<
		Pick<Item, 'id' | 'code' | 'name' | 'sellingPrice' | 'stock'>
	>
	itemTransaction: SerializeFrom<
		Pick<ItemTransaction, 'id' | 'quantity' | 'type' | 'totalPrice'>
	>
}) => {

	const [totalPrice, setTotalPrice] = useState(item.sellingPrice || 0)
	const [isFocused, setIsFocused] = useState(false)
	const [quantity, setQuantity] = useState(itemTransaction.quantity)
	const [transactionType, setTransactionType] = useState<StateType>(
		itemTransaction.type as StateType,
	)

	const submit = useSubmit()
	const fetcher = useFetcher({ key: 'upsert-item-transaction' })

	// const handleFormChange = useDebounce((form: HTMLFormElement) => {
	// 	submit(form)
	// }, 400) //May need to use this if there are errors when posting?
	const formRef = useRef<HTMLFormElement>(null)
	const submitForm = () => {
		if (formRef.current) {
			submit(formRef.current, {
				navigate: false,
				fetcherKey: 'upsert-item-transaction',
			})
		}
	}
	// We may want to apply this on 'Enter'
	const submitAndFocusNext = () => {
		submitForm()
		//focus next row
	}

	useEffect(() => {
		if (item.sellingPrice) {
			setTotalPrice(item.sellingPrice * quantity)
		}
	}, [quantity, item.sellingPrice])

	//If user presses a number, it should change the quantity or focus the input?
	//Maybe I want arrow up and down to switch the focus between rows instead of increasing stock

	const rowRef = useRef<HTMLTableRowElement>(null)
	const handleKeyDown = (event: KeyboardEvent) => {
		switch (event.key) {
			case 'ArrowUp':
			case 'ArrowRight':
				event.preventDefault()
				setQuantity(q => (q < item.stock ? q + 1 : q))
				break
			case 'ArrowDown':
			case 'ArrowLeft':
				event.preventDefault()
				setQuantity(q => (q > 1 ? q - 1 : q))
				break
			case 'V':
			case 'v':
				setTransactionType('VENTA')
				break
			case 'D':
			case 'd':
				setTransactionType('DEVOL')
				break
			case 'P':
			case 'p':
				setTransactionType('PREST')
				break
		}
	}

	useEffect(() => {
		const row = rowRef.current
		if (row) {
			row.addEventListener('keydown', handleKeyDown)
		}
		return () => {
			if (row) {
				row.removeEventListener('keydown', handleKeyDown)
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
				<AuthenticityTokenInput />
				<input type="hidden" name="it-id" value={itemTransaction.id} />
				<input type="hidden" name="it-vpd" value={transactionType} />
				<input type="hidden" name="it-quantity" value={quantity} />
				<input type="hidden" name="it-total-price" value={totalPrice} />
			</fetcher.Form>
			<TableRow
				onBlurCapture={() => submitForm()}
				ref={rowRef}
				className={cn(
					'uppercase',
					isFocused && 'bg-primary/10 hover:bg-primary/10',
				)}
				tabIndex={0}
				onBlur={() => setIsFocused(false)}
				onFocus={() => setIsFocused(true)}
			>
				<TableCell className="flex items-center justify-center">
					<DeleteItemTransaction id={itemTransaction.id} />
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
				<TableCell className="">
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
}

export const TYPE_SELL = 'VENTA'
export const TYPE_RETURN = 'DEVOL'
export const TYPE_LOAN = 'PREST'

export type StateType = typeof TYPE_SELL | typeof TYPE_RETURN | typeof TYPE_LOAN

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
				  ? TYPE_LOAN
				  : TYPE_SELL
		setType(nextState)
	}

	return (
		<div
			className={cn(
				'flex w-[4rem] cursor-pointer select-none items-center justify-center rounded-md text-xs font-bold uppercase tracking-wider text-background',
				initialType === TYPE_SELL && 'bg-primary/80',
				initialType === TYPE_RETURN && 'bg-orange-500/80',
				initialType === TYPE_LOAN && 'bg-blue-500/80',
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
