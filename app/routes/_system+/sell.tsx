import {
	type SerializeFrom,
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Link, useFetcher, useLoaderData, useNavigate } from '@remix-run/react'

import {
	ItemProps,
	ItemTransactionRow,
} from '#app/components/item-transaction-row.tsx'
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
import { redirectWithToast } from '#app/utils/toast.server.ts'
import {
	destroyCurrentTransaction,
	getTransactionId,
	transactionKey,
	transactionSessionStorage,
} from '#app/utils/transaction.server.ts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import React, { createRef, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { ItemReader } from './item-transaction.new.tsx'
import { DiscardTransaction } from './transaction.discard.tsx'
import { Discount } from '@prisma/client'
export const TRANSACTION_STATUS_PENDING = 'Pendiente'
export const TRANSACTION_STATUS_COMPLETED = 'Finalizada'
export const TRANSACTION_STATUS_DISCARDED = 'Cancelada'

const transactionTypes = [
	TRANSACTION_STATUS_PENDING,
	TRANSACTION_STATUS_COMPLETED,
	TRANSACTION_STATUS_DISCARDED,
] as const
export const TransactionStatusSchema = z.enum(transactionTypes)
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>

export const PAYMENT_METHOD_CASH = 'Contado'
export const PAYMENT_METHOD_CREDIT = 'Crédito'
const paymentMethodTypes = [PAYMENT_METHOD_CASH, PAYMENT_METHOD_CREDIT] as const
export const PaymentMethodSchema = z.enum(paymentMethodTypes)
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>

export async function loader({ request }: LoaderFunctionArgs) {
	const transactionId = await getTransactionId(request)
	const userId = await requireUserId(request)

	// const pendingTransaction = await prisma.transaction.findFirst({
	// 	where: {
	// 		sellerId: userId,
	// 		id: transactionId,
	// 		status: TRANSACTION_STATUS_PENDING,
	// 	},
	// })

	if (!transactionId) {
		const transactionSession = await transactionSessionStorage.getSession(
			request.headers.get('cookie'),
		)

		const newTransaction = await prisma.transaction.create({
			data: {
				seller: { connect: { id: userId } },
				status: TRANSACTION_STATUS_PENDING,
				paymentMethod: PAYMENT_METHOD_CASH,
				totalDiscount: 0,
				subtotal: 0,
				total: 0,
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
						totalDiscount: true,
						item: {
							select: {
								id: true,
								code: true,
								name: true,
								sellingPrice: true,
								stock: true,
								discount: true,
								family: { select: { discount: true } },
							},
						},

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
			totalDiscount: true,
			total: true,
			seller: { select: { name: true } },
			items: {
				select: {
					id: true,
					type: true,
					quantity: true,
					totalPrice: true,
					totalDiscount: true,
					item: {
						select: {
							id: true,
							code: true,
							name: true,
							sellingPrice: true,
							stock: true,
							discount: true,
							family: { select: { discount: true } },
						},
					},
				},
			},
		},
	})

	invariantResponse(currentTransaction, 'No es posible cargar la transacción.')

	return json({ transaction: currentTransaction })
}

const SetPaymentMethodSchema = z.object({
	intent: z.string(),
	paymentMethod: PaymentMethodSchema,
})

const CompleteTransactionSchema = z.object({
	intent: z.string(),
	total: z.coerce.number(),
	subtotal: z.coerce.number(),
	totalDiscount: z.coerce.number(),
})

export async function action({ request }: ActionFunctionArgs) {
	await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')
	const transactionId = await getTransactionId(request)
	invariantResponse(transactionId, 'No es posible cargar la transacción.')

	if (intent === 'set-payment-method') {
		const setPaymentResult = SetPaymentMethodSchema.safeParse({
			intent: formData.get('intent'),
			paymentMethod: formData.get('payment-method'),
		})
		if (!setPaymentResult.success) {
			return json(
				{
					status: 'error',
					errors: setPaymentResult.error.flatten(),
				} as const,
				{
					status: 400,
				},
			)
		}
		const { paymentMethod } = setPaymentResult.data

		await prisma.transaction.update({
			where: { id: transactionId },
			data: { paymentMethod },
		})

		return json({ status: 'success' } as const)
	}

	if (intent === 'complete-transaction') {
		const completeTransactionResult = CompleteTransactionSchema.safeParse({
			intent: formData.get('intent'),
			total: formData.get('total'),
			subtotal: formData.get('subtotal'),
			totalDiscount: formData.get('totalDiscount'),
		})

		if (!completeTransactionResult.success) {
			return json(
				{
					status: 'error',
					errors: completeTransactionResult.error.flatten(),
				} as const,
				{
					status: 400,
				},
			)
		}
		const { total, subtotal, totalDiscount } = completeTransactionResult.data
		await prisma.transaction.update({
			where: { id: transactionId },
			data: {
				status: TRANSACTION_STATUS_COMPLETED,
				total,
				subtotal,
				totalDiscount,

				completedAt: new Date(),
			},
		})

		return redirectWithToast(
			`/reports/${transactionId}`,
			{
				type: 'success',
				title: 'Transacción Completa',
				description: `Venta completada bajo ID de transacción: [${transactionId.toUpperCase()}].`,
			},
			{
				headers: {
					'Set-Cookie': await destroyCurrentTransaction(request),
				},
			},
		)
	}

	return json({ status: 'error', errors: ['Not a Valid Intent'] } as const, {
		status: 400,
	})
}

export const isDiscountActive = (discount: SerializeFrom<Discount>) => {
	const now = new Date()
	const validFrom = new Date(discount.validFrom)
	const validUntil = new Date(discount.validUntil)
	const isValid = validFrom <= now && validUntil >= now

	return isValid && discount.isActive
}

export default function SellRoute() {
	//! CHECK OTHER FILTERS AND ADD THE TOLOWERCASE() WHERE NEEDED.

	const { transaction } = useLoaderData<typeof loader>()

	const currentPaymentMethod = PaymentMethodSchema.parse(
		transaction.paymentMethod,
	)

	let allItemTransactions = transaction.items

	function hasMinQuantity(
		discount: SerializeFrom<Discount> | null | undefined,
	): discount is SerializeFrom<Discount> {
		return discount?.minQuantity !== undefined
	}


	const validDiscounts = allItemTransactions.flatMap(itemTransaction => {
		const familyDiscount = itemTransaction.item?.family?.discount
		const itemDiscount = itemTransaction.item?.discount

		const isValidFamilyDiscount =
			hasMinQuantity(familyDiscount) &&
			familyDiscount.minQuantity <= itemTransaction.quantity
		const isValidItemDiscount =
			hasMinQuantity(itemDiscount) &&
			itemDiscount.minQuantity <= itemTransaction.quantity

		const allDiscounts: SerializeFrom<Discount>[] = []
		if (isValidFamilyDiscount) {
			allDiscounts.push(familyDiscount)
		}
		if (isValidItemDiscount) {
			allDiscounts.push(itemDiscount)
		}

		const validDiscounts = allDiscounts.filter(Boolean).filter(isDiscountActive)
		return validDiscounts
	})

	//!There is a bug when I activate a promo based on the item quantity, and then decrease the amount.
	//!The type of the transaction is updated, but the discount still shows in the panel until another submit is made.
	const discounts = validDiscounts.filter(
		(discount, index, discounts) =>
			discounts.findIndex(d => d.id === discount.id) === index,
	)

	const discount = allItemTransactions
		.map(itemTransaction => itemTransaction.totalDiscount)
		.reduce((a, b) => a + b, 0)

	const total = allItemTransactions
		.map(itemTransaction => itemTransaction.totalPrice)
		.reduce((a, b) => a + b, 0)

	const subtotal = total + discount

	// This is so we can focus the last element in the array automatically
	const itemRefs = useRef<React.RefObject<HTMLTableRowElement>[]>([])

	const [focusedRowIndex, setFocusedRowIndex] = useState<number>(0)

	//Keyboard navigation for the ItemTransactionRows
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'ArrowDown') {
				event.preventDefault()
				setFocusedRowIndex(prev =>
					prev === allItemTransactions.length - 1
						? 0
						: Math.min(prev + 1, allItemTransactions.length - 1),
				)
			} else if (event.key === 'ArrowUp') {
				event.preventDefault()
				setFocusedRowIndex(prev =>
					prev === 0 ? allItemTransactions.length - 1 : Math.max(prev - 1, 0),
				)
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [allItemTransactions.length])

	useEffect(() => {
		itemRefs.current[focusedRowIndex]?.current?.focus()
	}, [focusedRowIndex])

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

	return (
		<div className="flex h-full flex-col">
			<div className="flex-1">
				<div className="flex flex-col items-center justify-between md:flex-row">
					<h1 className="text-2xl">Venta de artículos</h1>
					<h1 className="text-md text-foreground/80">
						ID Transacción:{' '}
						<span className="cursor-pointer rounded-md p-1 uppercase text-foreground hover:bg-secondary">
							{transaction?.id}
						</span>
					</h1>
				</div>
				<div className="mt-4 flex flex-col justify-between gap-2 md:flex-row">
					<ItemReader
						ref={itemReaderRef}
						autoFocus
						autoSubmit
						status={'idle'}
					/>
					<div className="flex justify-between gap-4 md:justify-normal">
						<Button variant={'outline'} asChild>
							<Link
								target="_blank"
								reloadDocument
								to={`/reports/${transaction.id}/report-pdf`}
							>
								<Icon className="mr-2 flex-none" name="report-money" /> Generar
								Reporte
							</Link>
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
												itemReaderRef={itemReaderRef}
												ref={itemRefs.current[index]}
												itemTransaction={itemTransaction}
												key={itemTransaction.item.id}
												item={itemTransaction.item as SerializeFrom<ItemProps>}
											/>
										)
									} else return null
								})}
						</TableBody>
					</Table>
				</ScrollArea>
			</div>

			<div className="mx-auto mt-auto flex h-[11rem] w-fit gap-8  rounded-md bg-secondary py-4 pl-4 pr-6 ">
				<DiscountsPanel activeDiscounts={discounts} />
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
					<PaymentSelection currentPaymentMethod={currentPaymentMethod} />
					{transaction && (
						<ConfirmFinishTransaction
							transaction={{ transaction }}
							total={total}
							subtotal={subtotal}
							totalDiscount={discount}
						/>
					)}
				</div>
			</div>
		</div>
	)
}

export const ConfirmDeleteTransaction = ({
	transactionId,
}: {
	transactionId: string
}) => {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant={'destructive'}>
					<Icon name="trash" className="mr-2 flex-none" /> Descartar Transacción
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmar descarte de transacción</AlertDialogTitle>
					<AlertDialogDescription>
						Por favor confirme que desea descartar esta transacción
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

const DiscountsPanel = ({
	activeDiscounts,
}: {
	activeDiscounts: SerializeFrom<Discount>[]
}) => {
	const navigate = useNavigate()

	return (
		<div className="relative flex h-[10rem] w-full min-w-[20rem] flex-col gap-1 md:h-auto md:w-[20rem]">
			{activeDiscounts.length === 0 ? (
				<div className="flex h-full flex-col items-center justify-center gap-2 rounded-md  bg-background/30 p-1">
					<span className="select-none text-lg text-foreground/50">
						Sin promociones aplicables
					</span>
				</div>
			) : (
				<ScrollArea className="flex h-full flex-col  gap-1 rounded-md bg-background/30   text-sm ">
					<div className="text-md sticky top-0 z-40 flex h-[1.5rem] w-[inherit] select-none items-center justify-center bg-background/70 text-center text-foreground/90">
						Promociones aplicables ({activeDiscounts.length})
					</div>
					<ul className="mt-1 flex flex-col font-semibold tracking-tight">
						{activeDiscounts.map(discount => {
							return (
								<li
									key={discount.id}
									className="w-full cursor-pointer select-none px-1 hover:bg-secondary "
									onClick={() => navigate(`/discounts/${discount.id}`)}
								>
									{discount.description}
								</li>
							)
						})}
					</ul>
				</ScrollArea>
			)}

			<div>
				{/* This will be its own component that opens a modal and changes to set the current direct discount */}
				<Button className="h-8 w-full " variant={'outline'}>
					<Icon className="mr-2" name="tag" /> Descuento Directo
				</Button>
			</div>
		</div>
	)
}

const PaymentSelection = ({
	currentPaymentMethod,
}: {
	currentPaymentMethod: PaymentMethod
}) => {
	const [paymentMethod, setPaymentMethod] =
		useState<PaymentMethod>(currentPaymentMethod)

	const fetcher = useFetcher({ key: 'set-paymentMethod' })
	const isSubmitting = fetcher.state !== 'idle'

	const formData = useMemo(() => {
		const fd = new FormData()
		fd.append('intent', 'set-payment-method')
		fd.append('payment-method', paymentMethod)
		return fd
	}, [paymentMethod])

	useEffect(() => {
		fetcher.submit(formData, { method: 'POST' })
	}, [formData])

	return (
		<div
			className={cn(
				'flex w-full rounded-md bg-background p-1',
				isSubmitting && 'pointer-events-none cursor-not-allowed opacity-50',
			)}
		>
			{paymentMethodTypes.map((paymentMethodType, index) => (
				<div
					onClick={() => setPaymentMethod(paymentMethodType)}
					className={cn(
						'w-full cursor-pointer rounded-md p-2 text-center',
						paymentMethodType === paymentMethod &&
							'bg-primary/50  ring-1 ring-primary ring-offset-0 ',
					)}
					key={index}
				>
					{paymentMethodType}
				</div>
			))}
		</div>
	)
}

const ConfirmFinishTransaction = ({
	transaction,
	total,
	subtotal,
	totalDiscount,
}: {
	transaction: SerializeFrom<typeof loader>
	total: number
	subtotal: number
	totalDiscount: number
}) => {
	const { transaction: finishedTransaction } = transaction
	const fetcher = useFetcher({ key: 'complete-transaction' })
	const isSubmitting = fetcher.state !== 'idle'

	const formData = new FormData()
	formData.append('intent', 'complete-transaction')
	formData.append('total', total.toString())
	formData.append('subtotal', subtotal.toString())
	formData.append('totalDiscount', totalDiscount.toString())

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					disabled={finishedTransaction.items.length === 0}
					size={'lg'}
					className="text-md mt-6 flex h-[5rem] w-full gap-2 font-semibold md:h-full"
				>
					<Icon name="check" size="lg" />
					<span className="">Ingresar Venta</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-4">
						Confirmar Transacción{' '}
						<span className="rounded-md bg-primary/10 p-1 text-sm uppercase">
							{finishedTransaction.id}
						</span>
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							Confirme los datos de la venta para ingreso:
							<div className="fex mt-4 flex-col gap-1">
								{finishedTransaction.items.map(itemTransaction => {
									if (itemTransaction.item) {
										return (
											<div className="flex gap-4" key={itemTransaction.id}>
												<div className="flex flex-1 gap-2 overflow-clip ">
													<span className="font-bold">
														{itemTransaction.quantity}x
													</span>
													<span className="uppercase">
														{itemTransaction.item.name}
													</span>
												</div>
												<span className="w-[4rem] text-right">
													{formatCurrency(itemTransaction.totalPrice)}
												</span>
											</div>
										)
									}
									return null
								})}
							</div>
							<div className="mt-4 flex flex-col gap-1 ">
								<div className="flex gap-4">
									<span className="w-[9rem] font-bold">Vendedor:</span>
									<span>{finishedTransaction.seller?.name}</span>
								</div>
								<div className="flex gap-4">
									<span className="w-[9rem] font-bold">Fecha:</span>
									<span>
										{format(new Date(), "d 'de' MMMM 'del' yyyy'", {
											locale: es,
										})}
									</span>
								</div>
								<div className="flex gap-4">
									<span className="w-[9rem] font-bold">Método de Pago:</span>
									<span>{finishedTransaction.paymentMethod}</span>
								</div>
								<div className="flex gap-4">
									<span className="w-[9rem] font-bold">Total:</span>
									<span>{formatCurrency(total)}</span>
								</div>
							</div>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="mt-4 flex gap-6">
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					{isSubmitting ? (
						<Button className="w-[13rem]" disabled>
							<Icon name="update" className="mr-2 animate-spin opacity-80" />
							Confirmando Transacción
						</Button>
					) : (
						<Button
							className="w-[13rem]"
							onClick={() => fetcher.submit(formData, { method: 'POST' })}
						>
							<Icon name="checks" className="mr-2" />
							Confirmar y Finalizar
						</Button>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
