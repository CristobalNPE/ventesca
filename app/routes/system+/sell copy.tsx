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
import { requireUserId } from '#app/utils/auth.server.ts'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import {
	cn,
	formatCurrency,
	invariantResponse,
	useDebounce,
	useIsPending,
} from '#app/utils/misc.tsx'
import {
	getTransactionId,
	transactionKey,
	transactionSessionStorage,
} from '#app/utils/transaction.server.ts'
import { Item } from '@prisma/client'
import {
	ActionFunctionArgs,
	LoaderFunctionArgs,
	SerializeFrom,
	json,
} from '@remix-run/node'
import {
	useFetcher,
	useLoaderData,
	useSubmit
} from '@remix-run/react'

import { useEffect, useId, useRef, useState } from 'react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'

//We could create a Database object with the current sale, and then we could use it to add items, remove items, etc.
//action should add an remove items from the sale
//loader should return the current sale, and the items in it.
//we should define what data is important to have in a sale
//there should be STATUS for the sale, that can be PENDING/ CANCELED/ COMPLETED.
//all of these should be shown later in the "reporte de ventas" section
//important data for this entity would be: date, total, status, items. Also the user that created it, and the user that completed it.
//how to set the current transaction so the user doesn't lose it if he refreshes the page??
//seller can only have one sale in progress at a time, so we can use that to set the current sale.
//to get rid of it, user has to complete the sale, or discard it.
//if user discards it, we should ask for confirmation, and then delete it from the database.
//if user completes it, we should ask for confirmation, and then change the status to completed.
//if user tries to create a new sale, we should check if there is one in progress, and ask for confirmation to discard it.
//? I need to handle users first.
//!Should delete ItemTransactions when?

//Maybe when the ItemTransaction is focused, then onBlur, we should save the changes to the database.

export async function loader({ request }: LoaderFunctionArgs) {
	//check if there is a transaction in progress, if there is, load it, else create a new one.
	//return the current transaction, with the items in it.

	const transactionId = await getTransactionId(request)
	const userId = await requireUserId(request)
	if (!transactionId) {
		const transactionSession = await transactionSessionStorage.getSession(
			request.headers.get('cookie'),
		)

		const newTransaction = await prisma.transaction.create({
			data: {
				seller: { connect: { id: userId } },
				status: 'PENDING',
				subtotal: 0,
				total: 0,
				discount: 0,
			},
			select: {
				id: true,
				status: true,
				createdAt: true,
				total: true,
				seller: { select: { name: true } },
				items: { select: { id: true, type: true, item: true } },
			},
		})

		transactionSession.set(transactionKey, newTransaction.id)
		return json(
			{ transaction: newTransaction },
			{
				headers: {
					'Set-Cookie':
						await transactionSessionStorage.commitSession(transactionSession),
				},
			},
		)
	}

	const currentTransaction = await prisma.transaction.findUnique({
		where: { id: transactionId },
		select: {
			id: true,
			status: true,
			createdAt: true,
			total: true,
			seller: { select: { name: true } },
			items: {
				select: {
					id: true,
					type: true,
					quantity: true,
					item: {
						select: {
							id: true,
							code: true,
							name: true,
							sellingPrice: true,
							stock: true,
						},
					},
				},
			},
		},
	})

	return json({ transaction: currentTransaction })
}

const SearchSchema = z.object({
	search: z.number(),
})

export async function action({ request }: ActionFunctionArgs) {
	//will get an item code, search the item in the db, create a ItemTransaction for it, and add it to the current transaction.
	const transactionId = await getTransactionId(request)
	console.log(transactionId)
	invariantResponse(transactionId, 'Debe haber una venta en progreso.')

	const formData = await request.formData()
	await validateCSRF(formData, request.headers)

	const result = SearchSchema.safeParse({
		search: Number(formData.get('search')),
	})

	if (!result.success) {
		return json({ status: 'error', errors: result.error.flatten() } as const, {
			status: 400,
		})
	}
	const { search } = result.data

	const item = await prisma.item.findUnique({
		where: { code: search },
		select: {
			id: true,
			code: true,
			name: true,
			sellingPrice: true,
			stock: true,
		},
	})
	if (!item) return null

	//or maybe we upsert? so we can update the quantity if the item is already in the transaction.
	const itemTransaction = await prisma.itemTransaction.create({
		data: {
			type: 'VENTA',
			item: { connect: { id: item.id } },
			transaction: { connect: { id: transactionId } },
			quantity: 1,
			totalPrice: item.sellingPrice ?? 0, //Can be null because of bad DB data, but we don't want to crash the app.
		},
		select: {
			id: true,
			type: true,
			quantity: true,
			item: {
				select: {
					id: true,
					code: true,
					name: true,
					sellingPrice: true,
					stock: true,
				},
			},
		},
	})

	console.log(search)
	return null
}

type Transaction = {
	id: number
	status: string
	quantity: number
	total: number
	
}
export default function SellRoute() {
	//! CHECK OTHER FILTERS AND ADD THE TOLOWERCASE() WHERE NEEDED.

	const { transaction } = useLoaderData<typeof loader>()

	//we might need to store the ItemTransactions in a state array, so we can add and remove them.
	//it should be an array of ItemTransaction

	//create various ItemTransaction type of objects to map them to the table.
	//maybe on blur they should go to the database?


	// const [subtotal, setSubtotal] = useState(0)


	//we need to programmatically set focus to the last row of the table
	return (
		<>
			<div className="flex items-center justify-between">
				<h1 className="text-2xl">Venta de artículos</h1>
				<h1 className="text-md text-foreground/80">
					ID Transacción:{' '}
					<span className="cursor-pointer rounded-md p-1 uppercase text-foreground hover:bg-secondary">
						{transaction?.id}
					</span>
				</h1>
			</div>
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
						{transaction &&
							transaction.items.map(item => {
								if (item.item) {
									return (
										<SellRow
											key={item.item.id}
											item={item.item}
											transactionType={item.type}
										/>
									)
								} else return null
							})}
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
				'flex w-[4rem] cursor-pointer select-none items-center justify-center rounded-md text-xs font-bold uppercase tracking-wider text-background',
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
			<AuthenticityTokenInput />
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
