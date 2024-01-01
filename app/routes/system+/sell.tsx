import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
} from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'

import React, { createRef, useEffect, useRef, useState } from 'react'
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
import { cn, formatCurrency, invariantResponse } from '#app/utils/misc.tsx'
import {
	getTransactionId,
	transactionKey,
	transactionSessionStorage,
} from '#app/utils/transaction.server.ts'
import { ItemReader } from './item-transaction.new.tsx'
import { DiscardTransaction } from './transaction.discard.tsx'
import { z } from 'zod'

export const TRANSACTION_STATUS_PENDING = 'Pendiente'
export const TRANSACTION_STATUS_COMPLETED = 'Finalizada'
export const TRANSACTION_STATUS_DISCARDED = 'Cancelada'

const transactionTypes = [
	TRANSACTION_STATUS_PENDING,
	TRANSACTION_STATUS_COMPLETED,
	TRANSACTION_STATUS_DISCARDED,
] as const
const TransactionStatusSchema = z.enum(transactionTypes)
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>

export const PAYMENT_METHOD_CASH = 'Contado'
export const PAYMENT_METHOD_CREDIT = 'Crédito'
const paymentMethodTypes = [PAYMENT_METHOD_CASH, PAYMENT_METHOD_CREDIT] as const
const PaymentMethodSchema = z.enum(paymentMethodTypes)
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>

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
				status: TRANSACTION_STATUS_PENDING,
				paymentMethod: PAYMENT_METHOD_CASH,
				subtotal: 0,
				total: 0,
				discount: 0,
			},
			select: {
				id: true,
				status: true,
				createdAt: true,
				paymentMethod: true,
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
			paymentMethod: true,
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
	await requireUserId(request)

	return json({ status: 'success' } as const)
}

export default function SellRoute() {
	//! CHECK OTHER FILTERS AND ADD THE TOLOWERCASE() WHERE NEEDED.

	const { transaction } = useLoaderData<typeof loader>()

	let allItemTransactions = transaction.items

	const [paymentMethod, setPaymentMethod] =
		useState<PaymentMethod>(PAYMENT_METHOD_CASH)

	const discount = 0

	const subtotal = allItemTransactions
		.map(itemTransaction => itemTransaction.totalPrice)
		.reduce((a, b) => a + b, 0)

	const total = subtotal - discount

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
							<TableHead>Cantidad</TableHead>

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

			<div className="mx-auto flex h-[11rem] w-fit gap-10 rounded-md  bg-secondary py-4 pl-4 pr-6">
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
							{formatCurrency(total)}
						</span>
					</div>
				</div>
				<div className="flex flex-col items-center justify-between">
					<PaymentSelection
						selectedPaymentMethod={paymentMethod}
						setPaymentMethod={setPaymentMethod}
					/>

					<Button size={'lg'} className="flex w-full h-full mt-6 gap-2 text-md font-semibold">
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

const PaymentSelection = ({
	selectedPaymentMethod,
	setPaymentMethod,
}: {
	selectedPaymentMethod: PaymentMethod
	setPaymentMethod: (paymentMethod: PaymentMethod) => void
}) => {
	return (
		<div className="flex w-full rounded-md bg-background p-1">
			{paymentMethodTypes.map((paymentMethod, index) => (
				<div
					onClick={() => setPaymentMethod(paymentMethod)}
					className={cn(
						'w-full cursor-pointer rounded-md p-2 text-center',
						paymentMethod === selectedPaymentMethod && 'bg-primary/50',
					)}
					key={index}
				>
					{paymentMethod}
				</div>
			))}
		</div>
	)
}
