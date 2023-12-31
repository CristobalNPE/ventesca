import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'

import React, { createRef, useEffect, useRef } from 'react'
import { ItemTransactionRow } from '#app/components/item-transaction-row.tsx'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '#app/components/ui/alert-dialog.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency, invariantResponse } from '#app/utils/misc.tsx'
import {
	getTransactionId,
	transactionKey,
	transactionSessionStorage,
} from '#app/utils/transaction.server.ts'
import { ItemReader } from './item-transaction.new.tsx'
import { DiscardTransaction } from './transaction.discard.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
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

export async function action({ request }: ActionFunctionArgs) {
	return json({ status: 'success' } as const)
}

export default function SellRoute() {
	//! CHECK OTHER FILTERS AND ADD THE TOLOWERCASE() WHERE NEEDED.

	const { transaction } = useLoaderData<typeof loader>()

	let allItemTransactions = transaction.items
	const discount = 0

	// This is so we can focus the last element in the array automatically
	const itemRefs = useRef<React.RefObject<HTMLTableRowElement>[]>([])

	itemRefs.current = allItemTransactions.map(
		(_, i) => itemRefs.current[i] ?? createRef(),
	)

	// This is so we can focus the ItemReader after pressing Enter on a row
	const itemReaderRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		// Focus the last element in the array
		const lastItemRef = itemRefs.current[allItemTransactions.length - 1]
		if (lastItemRef) {
			lastItemRef.current?.focus()
		}
	}, [allItemTransactions.length])

	const subtotal = allItemTransactions
		.map(itemTransaction => itemTransaction.totalPrice)
		.reduce((a, b) => a + b, 0)

	// Key navigation for the ItemTransactionRows
	const handleArrowKeyPress = (
		key: 'ArrowUp' | 'ArrowDown',
		itemTransactionId: string,
	) => {
		const currentIndex = allItemTransactions.findIndex(
			itemTransaction => itemTransaction.id === itemTransactionId,
		)
		let nextIndex = key === 'ArrowUp' ? currentIndex - 1 : currentIndex + 1

		//Ensure nextIndex is within bounds
		nextIndex = Math.max(0, Math.min(nextIndex, allItemTransactions.length))
		const nextItemRef = itemRefs.current[nextIndex]
		nextItemRef.current?.focus()
	}

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
				<ItemReader ref={itemReaderRef} autoFocus autoSubmit status={'idle'} />
				<div className="flex gap-4">
					<Button variant={'outline'}>
						<Icon className="mr-2" name="banknote" /> Descargar Cotización
					</Button>

					<ConfirmDeleteTransaction transactionId={transaction.id} />
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
							allItemTransactions.map((itemTransaction, index) => {
								if (itemTransaction.item) {
									return (
										<ItemTransactionRow
											onArrowKeyPress={handleArrowKeyPress}
											itemReaderRef={itemReaderRef}
											ref={itemRefs.current[index]}
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

			<div className="mx-auto flex h-[11rem] w-fit justify-between gap-10 rounded-md  bg-secondary py-4 pl-4 pr-6">
				<DiscountsPanel />
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
					<OptionsToggle
						name={'paymentMethod'}
						firstValue={'contado'}
						secondValue={'credito'}
						firstLabel={'Contado'}
						secondLabel={'Crédito'}
					/>

					<Button size={'lg'} className="flex w-full  gap-2 ">
						<Icon name="check" size="lg" />
						<span className="">Ingresar Venta</span>
					</Button>
				</div>
			</div>
		</>
	)
}

const ConfirmDeleteTransaction = ({
	transactionId,
}: {
	transactionId: string
}) => {
	return (
		<AlertDialog>
			<AlertDialogTrigger>
				<Button variant={'destructive'}>
					<Icon name="trash" className="mr-2" /> Descartar Venta
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmar descarte de venta</AlertDialogTitle>
					<AlertDialogDescription>
						Por favor confirme que desea descartar esta venta
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="flex gap-6">
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<DiscardTransaction id={transactionId} />
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

const DiscountsPanel = () => {
	return (
		<div className="flex w-[17rem] flex-col gap-1">
			<div className="flex h-full flex-col items-center justify-center gap-2 rounded-md   bg-background/30 p-1">
				<span className="select-none text-lg text-foreground/50">
					Sin promociones aplicables
				</span>
			</div>

			<div>
				{/* This will be its own component that opens a modal and changes to say the current direct discount */}
				<Button className="h-8 w-full " variant={'outline'}>
					<Icon className="mr-2" name="tag" /> Descuento Directo
				</Button>
			</div>
		</div>
	)
}

const OptionsToggle = ({
	name,
	firstValue,
	secondValue,
	firstLabel,
	secondLabel,
}: {
	name: string
	firstValue: string
	secondValue: string
	firstLabel: string
	secondLabel: string
}) => {
	return (
		<div className="has:[:checked]:bg-background flex w-full rounded-md border-2 border-foreground/5 p-[2px]">
			<label
				className="w-1/2  cursor-pointer rounded-md bg-secondary p-2 text-center "
				htmlFor="id"
			>
				<input
					className="appearance-none "
					id="id"
					type="radio"
					name={name}
					value={firstValue}
				/>
				{firstLabel}
			</label>
			<label
				className="w-1/2 cursor-pointer rounded-md  bg-secondary p-2 text-center "
				htmlFor="id2"
			>
				<input
					className="appearance-none "
					id="id2"
					type="radio"
					name={name}
					value={secondValue}
				/>
				{secondLabel}
			</label>
		</div>
	)
}
