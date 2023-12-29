import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import {
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
import { ActionFunctionArgs, LoaderFunctionArgs, json } from '@remix-run/node'
import { useFetcher, useLoaderData, useSubmit } from '@remix-run/react'

import {
	ItemTransactionRow,
	TYPE_SELL,
} from '#app/components/item-transaction-row.tsx'
import { useId, useRef, useState } from 'react'
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
				status: 'PENDIENTE',
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
				items: {
					select: {
						id: true,
						type: true,
						item: true,
						quantity: true,
						totalPrice: true,
					},
				},
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
					totalPrice: true,
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

	invariantResponse(currentTransaction, 'No es posible cargar la transacción.')

	return json({ transaction: currentTransaction })
}

const SearchSchema = z.object({
	search: z.number(),
})

export async function action({ request }: ActionFunctionArgs) {
	//will get an item code, search the item in the db, create a ItemTransaction for it, and add it to the current transaction.
	const transactionId = await getTransactionId(request)

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

	//Create the default ItemTransaction
	await prisma.itemTransaction.create({
		data: {
			type: TYPE_SELL,
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

	return json({ status: 'success' } as const)
}

export default function SellRoute() {
	//! CHECK OTHER FILTERS AND ADD THE TOLOWERCASE() WHERE NEEDED.

	const { transaction } = useLoaderData<typeof loader>()

	const allItemTransactions = transaction.items

	//We might need to use a state for allItemTransactions, so we can add and remove items from it and apply some optimistic UI.

	// const removeItemTransactionFromStateById = (id: string) => {
	// 	 const newItems = items.filter(item => item.id !== id)
	// 	 setItems(newItems)

	// }

	const subtotal = allItemTransactions
		.map(itemTransaction => itemTransaction.totalPrice)
		.reduce((a, b) => a + b, 0)

	const discount = 0

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
				<ItemReader autoFocus autoSubmit status={'idle'} />
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
							<TableHead className="w-[50px]"></TableHead>
							<TableHead className="w-[100px]">Código</TableHead>
							<TableHead className="w-[100px]">
								<span className="tracking-widest">V/P/D</span>
							</TableHead>
							<TableHead className="">Descripción Articulo</TableHead>
							<TableHead>Precio</TableHead>
							<TableHead className="">Cantidad</TableHead>

							<TableHead className="text-right">Total</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody className=" bg-background/60">
						{transaction &&
							allItemTransactions.map(itemTransaction => {
								if (itemTransaction.item) {
									return (
										<ItemTransactionRow
											itemTransaction={itemTransaction}
											key={itemTransaction.item.id}
											item={itemTransaction.item}
										/>
									)
								} else return null
							})}
					</TableBody>
				</Table>
			</ScrollArea>

			{/* <div className="relative  -bottom-3 mx-auto flex h-[12rem] w-fit justify-between gap-16 rounded-md  bg-secondary py-4 pl-4 pr-6"> */}
			<div className="mx-auto flex h-[10.5rem] w-fit justify-between gap-16 rounded-md  bg-secondary py-4 pl-4 pr-6">
				<div className="flex flex-col justify-between gap-2">
					<div className="flex items-center text-2xl text-foreground/80">
						<span className="w-[12rem] pl-2">Subtotal:</span>
						<span className="w-[12rem] rounded-md bg-background/50 p-1">
							{formatCurrency(subtotal)}
						</span>
					</div>
					<div className="flex items-center text-2xl text-foreground/80">
						<span className="w-[12rem] pl-2">Descuentos:</span>
						<span className="w-[12rem] rounded-md bg-background/50 p-1">
							{formatCurrency(discount)}
						</span>
					</div>
					<div className="flex items-center rounded-md bg-background/20 text-2xl font-bold">
						<span className="w-[12rem] pl-2">Total:</span>
						<span className="w-[12rem] rounded-md bg-background/50 p-1">
							{formatCurrency(subtotal - discount)}
						</span>
					</div>
				</div>
				<div className="flex flex-col items-center justify-between">
					<Button className="w-full " variant={'outline'}>
						<Icon className="mr-2" name="tag" /> Aplicar Descuento
						{/* Abre un modal con selección de descuentos creados en las sección de Promociones
							También permite aplicar Descuentos directos en porcentaje o monto fijo
						*/}
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
	const inputRef = useRef<HTMLInputElement>(null)
	const submit = useSubmit()
	const isSubmitting = useIsPending({
		formMethod: 'POST',
		formAction: '/system/sell',
	})
	const [value, setValue] = useState('')
	const fetcher = useFetcher({ key: 'add-item' })

	const handleFormChange = useDebounce((form: HTMLFormElement) => {
		submit(form)
		setValue('')
	}, 400)

	return (
		<fetcher.Form
			method="POST"
			action="/system/sell"
			className="flex flex-wrap items-center justify-center gap-2 rounded-md border-[1px] border-secondary bg-background"
			onChange={e => autoSubmit && handleFormChange(e.currentTarget)}
		>
			<AuthenticityTokenInput />
			<div className="flex-1">
				<Label htmlFor={id} className="sr-only">
					Search
				</Label>
				<Input
					value={value}
					onChange={e => setValue(e.target.value)}
					ref={inputRef}
					onFocus={onFocus}
					type="number"
					name="search"
					id={id}
					placeholder="Búsqueda Código"
					className="w-[10rem] border-none sm:w-[20rem] [&::-webkit-inner-spin-button]:appearance-none"
					autoFocus={autoFocus}
				/>
			</div>
			<div>
				<StatusButton
					type="submit"
					status={isSubmitting ? 'pending' : status}
					className="flex w-full items-center justify-center border-none"
					variant={'outline'}
					size="sm"
				>
					<Icon name="scan-barcode" size="md" />
					<span className="sr-only">Buscar</span>
				</StatusButton>
			</div>
		</fetcher.Form>
	)
}
