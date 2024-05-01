import { type Discount } from '@prisma/client'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'

import { Spacer } from '#app/components/spacer.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import {
	destroyCurrentTransaction,
	getTransactionId,
	transactionKey,
	transactionSessionStorage,
} from '#app/utils/transaction.server.ts'
import React, { createRef, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { ItemReader } from '../item-transaction.new.tsx'
import {
	PAYMENT_METHOD_CASH,
	PaymentMethodSchema,
} from './_types/payment-method.ts'

import { Button } from '#app/components/ui/button.tsx'
import {
	Drawer,
	DrawerContent,
	DrawerFooter,
	DrawerHeader,
	DrawerTrigger,
} from '#app/components/ui/drawer.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { ItemProps, ItemTransaction } from './_components/itemTransaction.tsx'
import {
	DiscountsPanel,
	PaymentMethodPanel,
	TransactionIdPanel,
	TransactionOptionsPanel,
	TransactionOverviewPanel,
} from './transaction-panel.tsx'

//? REFACTOR INTO ITS OWN SELL FOLDER, THIS FILE AS INDEX, AND SEPARATE INTO DIFFERENT COMPONENTS/TYPES/ETC

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

async function createNewTransaction(userId: string, businessId: string) {
	const newTransaction = await prisma.transaction.create({
		data: {
			seller: { connect: { id: userId } },
			status: TRANSACTION_STATUS_PENDING,
			paymentMethod: PAYMENT_METHOD_CASH,
			totalDiscount: 0,
			subtotal: 0,
			total: 0,
			business: { connect: { id: businessId } },
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
						},
					},
					quantity: true,
					totalPrice: true,
				},
			},
		},
	})

	return newTransaction
}

async function fetchTransactionDetails(transactionId: string) {
	return prisma.transaction.findUnique({
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
						},
					},
				},
			},
		},
	})
}

export async function loader({ request }: LoaderFunctionArgs) {
	const transactionId = await getTransactionId(request)
	const userId = await requireUserId(request)

	const { businessId } = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: { businessId: true },
	})

	async function respondWithNewTransaction(
		newTransaction: Awaited<ReturnType<typeof createNewTransaction>>,
	) {
		const transactionSession = await transactionSessionStorage.getSession(
			request.headers.get('cookie'),
		)
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

	if (!transactionId) {
		console.log('There was no transactionId in Cookie, creating new one...')
		const newTransaction = await createNewTransaction(userId, businessId)

		return respondWithNewTransaction(newTransaction)
	}

	//check for the transaction to belong to the current loggedIn user
	const currentSellerTransaction = await prisma.transaction.findUnique({
		where: { id: transactionId, sellerId: userId, businessId: businessId },
		select: { id: true },
	})

	if (!currentSellerTransaction) {
		console.log(
			"The transaction in the cookie didn't belong to current user...",
		)
		const newTransaction = await createNewTransaction(userId, businessId)
		return respondWithNewTransaction(newTransaction)
	}

	//Transaction belongs to current user, fetch and return it.

	const transactionDetails = await fetchTransactionDetails(transactionId)
	invariantResponse(transactionDetails, 'No es posible cargar la transacción')
	return json({ transaction: transactionDetails })
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

	// const validDiscounts = allItemTransactions.flatMap(itemTransaction => {
	// 	const familyDiscount = itemTransaction.item?.category.discount
	// 	const itemDiscount = itemTransaction.item?.discount

	// 	const isValidFamilyDiscount =
	// 		hasMinQuantity(familyDiscount) &&
	// 		familyDiscount.minQuantity <= itemTransaction.quantity
	// 	const isValidItemDiscount =
	// 		hasMinQuantity(itemDiscount) &&
	// 		itemDiscount.minQuantity <= itemTransaction.quantity

	// 	const allDiscounts: SerializeFrom<Discount>[] = []
	// 	if (isValidFamilyDiscount) {
	// 		allDiscounts.push(familyDiscount)
	// 	}
	// 	if (isValidItemDiscount) {
	// 		allDiscounts.push(itemDiscount)
	// 	}

	// 	const validDiscounts = allDiscounts.filter(Boolean).filter(isDiscountActive)
	// 	return validDiscounts
	// })

	//!There is a bug when I activate a promo based on the item quantity, and then decrease the amount.
	//!The type of the transaction is updated, but the discount still shows in the panel until another submit is made.

	//? JUST FOR TESTING
	const discounts = new Array<SerializeFrom<Discount>>()

	// const discounts = validDiscounts.filter(
	// 	(discount, index, discounts) =>
	// 		discounts.findIndex(d => d.id === discount.id) === index,
	// )

	const discount = allItemTransactions
		.map(itemTransaction => itemTransaction.totalDiscount)
		.reduce((a, b) => a + b, 0)

	const total = allItemTransactions
		.map(itemTransaction => itemTransaction.totalPrice)
		.reduce((a, b) => a + b, 0)

	const subtotal = total + discount

	// This is so we can focus the last element in the array automatically
	const itemRefs = useRef<React.RefObject<HTMLDivElement>[]>([])

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
		<div className="flex h-full flex-1  gap-12 ">
			<div className="flex-1 ">
				{/* //? I need to redo the item reader, change its width and add good feedback for when, for example, there is no stock or the item is not active */}
				<ItemReader ref={itemReaderRef} autoFocus autoSubmit status={'idle'} />
				<Spacer size="4xs" />
				<div className="flex flex-col gap-1  overflow-y-auto sm:max-h-[calc(100%-4rem)]">
					{transaction &&
						allItemTransactions.map((itemTransaction, index) => {
							if (itemTransaction.item) {
								return (
									<ItemTransaction
										itemTransaction={itemTransaction}
										key={itemTransaction.item.id}
										item={itemTransaction.item as SerializeFrom<ItemProps>}
										itemReaderRef={itemReaderRef}
										ref={itemRefs.current[index]}
									/>
								)
							} else return null
						})}
				</div>
			</div>

			<div className="mx-auto hidden w-[20rem] flex-col justify-between gap-4 xl:flex">
				<TransactionIdPanel transactionId={transaction.id} />
				{/* <PaymentSelectionPanel currentPaymentMethod={currentPaymentMethod} /> */}
				<PaymentMethodPanel currentPaymentMethod={currentPaymentMethod} />
				<DiscountsPanel activeDiscounts={discounts} />
				<TransactionOverviewPanel
					subtotal={subtotal}
					discount={discount}
					total={total}
				/>

				<TransactionOptionsPanel
					transaction={{ transaction }}
					total={total}
					subtotal={subtotal}
					totalDiscount={discount}
				/>
			</div>

			<Drawer>
				<DrawerTrigger asChild>
					<Button className="absolute bottom-5 right-5 flex rounded-full outline outline-4 xl:hidden">
						<Icon className="text-2xl" name="moneybag" />
					</Button>
				</DrawerTrigger>
				<DrawerContent>
					<DrawerHeader></DrawerHeader>

					<div className="mx-auto flex w-[20rem] flex-col justify-between gap-4 ">
						<TransactionIdPanel transactionId={transaction.id} />
						<PaymentMethodPanel currentPaymentMethod={currentPaymentMethod} />
						<DiscountsPanel activeDiscounts={discounts} />
						<TransactionOverviewPanel
							subtotal={subtotal}
							discount={discount}
							total={total}
						/>

						<TransactionOptionsPanel
							transaction={{ transaction }}
							total={total}
							subtotal={subtotal}
							totalDiscount={discount}
						/>
					</div>
					<DrawerFooter></DrawerFooter>
				</DrawerContent>
			</Drawer>
		</div>
	)
}
