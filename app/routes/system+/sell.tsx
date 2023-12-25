import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { prisma } from '#app/utils/db.server.ts'
import {
	cn,
	formatCurrency,
	useDebounce,
	useIsPending,
} from '#app/utils/misc.tsx'
import { Item } from '@prisma/client'
import { ActionFunctionArgs, LoaderFunctionArgs, SerializeFrom, json } from '@remix-run/node'
import {
	useFetcher,
	useLoaderData,
	useSubmit
} from '@remix-run/react'

import { useEffect, useId, useRef, useState } from 'react'

//We could create a Database object with the current sale, and then we could use it to add items, remove items, etc.
//action should add an remove items from the sale
//loader should return the current sale, and the items in it.
//we should define what data is important to have in a sale
//there should be STATUS for the sale, that can be PENDING/ CANCELED/ COMPLETED.
//all of these should be shown later in the "reporte de ventas" section
//important data for this entity would be: date, total, status, items. Also the user that created it, and the user that completed it.


export async function loader({ request }: LoaderFunctionArgs) {
	// const url = new URL(request.url)
	// const code = url.searchParams.get('code')

	const testItem = await prisma.item.findUnique({
		where: { code: 3424 },
		select: {
			id: true,
			code: true,
			name: true,
			sellingPrice: true,
			stock: true,
		},
	})

	return json({ item: testItem })
}


export async function action({request}:ActionFunctionArgs){
		const formData = await request.formData()
		const search = formData.get('search')
		console.log(search)
		return null;
}

export default function SellRoute() {
	//? MAYBE WE WANT TO CHECK IF THERE IS A SALE IN PROGRESS every time WE CLICK ON SOMETHING ON THE MENU, TO ALERT THE USER
	//! CHECK OTHER FILTERS AND ADD THE TOLOWERCASE() WHERE NEEDED.

	const { item } = useLoaderData<typeof loader>()
	// const [subtotal, setSubtotal] = useState(0)

	//we need to programmatically set focus to the last row of the table
	return (
		<>
			<h1 className="text-2xl">Venta de artículos</h1>
			<div className="mt-4 flex justify-between">
				{/* <Input className=" w-[20rem]" /> */}
				<ItemReader status={'idle'} />
				<div className="flex gap-4">
					<Button variant={'outline'}>
						<Icon className="mr-2" name="banknote" /> Descargar Cotización
					</Button>
					<Button variant={'destructive'}>
						<Icon name="trash" className="mr-2" /> Descartar Venta
					</Button>
				</div>
			</div>
			<ScrollArea className="my-4 h-[29rem] ">
				<Table className="min-w-full overflow-clip rounded-md ">
					<TableHeader className="  bg-secondary uppercase  ">
						<TableRow className="">
							<TableHead>Código</TableHead>
							<TableHead>V/P/D</TableHead>
							<TableHead className="">Descripción Articulo</TableHead>
							<TableHead>Precio</TableHead>
							<TableHead className="">Cantidad</TableHead>

							<TableHead className="text-right">Total</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody className=" bg-background/60">
						{item && <SellRow item={item} transactionType={'VENTA'} />}
					</TableBody>
				</Table>
			</ScrollArea>
			<div className="relative  -bottom-3 mx-auto flex h-[12rem] w-fit justify-between gap-16 rounded-md  bg-secondary py-4 pl-4 pr-6">
				<div className="flex flex-col justify-between gap-2">
					<div className="flex items-center text-2xl text-foreground/80">
						<span className="w-[12rem] pl-2">Subtotal:</span>
						<span className="w-[12rem] rounded-md bg-background/50 p-1">
							$999
						</span>
					</div>
					<div className="flex items-center text-2xl text-foreground/80">
						<span className="w-[12rem] pl-2">Descuentos:</span>
						<span className="w-[12rem] rounded-md bg-background/50 p-1">
							$0
						</span>
					</div>
					<div className="flex items-center rounded-md bg-background/20 text-2xl font-bold">
						<span className="w-[12rem] pl-2">Total:</span>
						<span className="w-[12rem] rounded-md bg-background/50 p-1">
							$999
						</span>
					</div>
				</div>
				<div className="flex flex-col items-center justify-between">
					<Button className="w-full " variant={'outline'}>
						<Icon className="mr-2" name="banknote" /> Aplicar Descuento
					</Button>

					<Button size={'lg'} className="flex w-full  gap-2 ">
						<Icon name="check" size="lg" />
						<span className="">Ingresar Venta</span>
					</Button>
				</div>
			</div>
		</>
	)
}

const SellRow = ({
	item,
}: {
	item: SerializeFrom<
		Pick<Item, 'id' | 'code' | 'name' | 'sellingPrice' | 'stock'>
	>
	transactionType: StateType
}) => {
	const [totalPrice, setTotalPrice] = useState(item.sellingPrice)
	const [isFocused, setIsFocused] = useState(false)
	const [quantity, setQuantity] = useState(1)
	const [transactionType, setTransactionType] = useState<StateType>('VENTA')

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
		<TableRow
			ref={rowRef}
			className={cn(
				'uppercase',
				isFocused && 'bg-primary/10 hover:bg-primary/10',
			)}
			tabIndex={0}
			onBlur={() => setIsFocused(false)}
			onFocus={() => setIsFocused(true)}
		>
			<TableCell className="font-bold">{item.code}</TableCell>
			<TableCell className="font-medium">
				<TransactionType
					initialType={transactionType}
					setType={setTransactionType}
				/>
			</TableCell>
			<TableCell className="font-medium tracking-wider">{item.name}</TableCell>
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
	)
}

type StateType = 'VENTA' | 'DEVOL' | 'PREST'

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
			initialType === 'VENTA'
				? 'DEVOL'
				: initialType === 'DEVOL'
				  ? 'PREST'
				  : 'VENTA'
		setType(nextState)
	}

	return (
		<div
			className={cn(
				'flex w-[4rem] cursor-pointer select-none items-center justify-center rounded-md uppercase text-background',
				initialType === 'VENTA' && 'bg-primary',
				initialType === 'DEVOL' && 'bg-orange-500',
				initialType === 'PREST' && 'bg-blue-500',
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
				className="aspect-square w-[2rem] p-0"
				onClick={decreaseValue}
				disabled={quantity <= min}
			>
				<Icon size="lg" name="minus" />
			</Button>
			<Input
				className="w-[3rem] [&::-webkit-inner-spin-button]:appearance-none"
				tabIndex={-1}
				type="number"
				value={quantity}
				onChange={handleInputChange}
			/>
			<Button
				tabIndex={-1}
				variant={'ghost'}
				className="aspect-square w-[2rem] p-0"
				onClick={increaseValue}
				disabled={quantity >= max}
			>
				<Icon size="lg" name="plus" />
			</Button>
		</div>
	)
}

///////////////////////////TEST SEARCH BAR //////////////////////////////////
function ItemReader({
	status,
	onFocus,
	autoFocus = false,
	autoSubmit = false,
}: {
	status: 'idle' | 'pending' | 'success' | 'error'
	onFocus?: () => void
	autoFocus?: boolean
	autoSubmit?: boolean
}) {
	const id = useId()

	const submit = useSubmit()
	const isSubmitting = useIsPending({
		formMethod: 'POST',
		formAction: '/system/sell',
	})
	const fetcher = useFetcher({ key: 'add-item' })

	const handleFormChange = useDebounce((form: HTMLFormElement) => {
		submit(form)
	}, 400)

	return (
		<fetcher.Form
			method="POST"
			action="/system/sell"
			className="flex flex-wrap items-center justify-center gap-2"
			onChange={e => autoSubmit && handleFormChange(e.currentTarget)}
		>
			<div className="flex-1">
				<Label htmlFor={id} className="sr-only">
					Search
				</Label>
				<Input
					onFocus={onFocus}
					type="number"
					name="search"
					id={id}
					placeholder="Búsqueda Código"
					className="w-[10rem] sm:w-[20rem] [&::-webkit-inner-spin-button]:appearance-none"
					autoFocus={autoFocus}
				/>
			</div>
			<div>
				<StatusButton
					type="submit"
					status={isSubmitting ? 'pending' : status}
					className="flex w-full items-center justify-center"
					size="sm"
				>
					<Icon name="scan-barcode" size="md" />
					<span className="sr-only">Buscar</span>
				</StatusButton>
			</div>
		</fetcher.Form>
	)
}
