import { type Discount } from '@prisma/client'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'

import { Spacer } from '#app/components/spacer.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { destroyCurrentTransaction } from '#app/utils/transaction.server.ts'
import React, { createRef, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { ItemReader } from '../_system+/item-transaction.new.tsx'
import { PaymentMethod, PaymentMethodSchema } from './_types/payment-method.ts'

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
import { TransactionDetailsSchema } from './_types/TransactionData.ts'
import { ItemTransactionType } from './_types/item-transactionType.ts'
import { TransactionStatus } from './_types/transaction-status.ts'
import {
	DiscountsPanel,
	PaymentMethodPanel,
	TransactionIdPanel,
	TransactionOptionsPanel,
	TransactionOverviewPanel,
} from './transaction-panel.tsx'

const transactionDetails = {
	id: true,
	status: true,
	createdAt: true,
	paymentMethod: true,
	totalDiscount: true,
	total: true,
	subtotal: true,
	seller: { select: { name: true } },
	itemTransactions: {
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
					discounts: true,
				},
			},
		},
	},
}

async function createNewTransaction(userId: string, businessId: string) {
	const newTransaction = await prisma.transaction.create({
		data: {
			seller: { connect: { id: userId } },
			status: TransactionStatus.PENDING,
			paymentMethod: PaymentMethod.CASH,
			totalDiscount: 0,
			subtotal: 0,
			total: 0,
			business: { connect: { id: businessId } },
		},
		select: transactionDetails,
	})

	return newTransaction
}

async function fetchTransactionDetails(transactionId: string) {
	const transaction = await prisma.transaction.findUniqueOrThrow({
		where: { id: transactionId },
		select: transactionDetails,
	})

	//update totals before serving to front end
	const discount = transaction.itemTransactions
		.filter(
			itemTransaction => itemTransaction.type === ItemTransactionType.PROMO,
		)
		.reduce((acc, itemTransaction) => acc + itemTransaction.totalDiscount, 0)

	const total = transaction.itemTransactions.reduce(
		(acc, itemTransaction) => acc + itemTransaction.totalPrice,
		0,
	)
	const subtotal = total + discount

	const updatedTransaction = await prisma.transaction.update({
		where: { id: transactionId },
		data: {
			totalDiscount: discount,
			total: total,
			subtotal: subtotal,
		},
		select: transactionDetails,
	})

	return updatedTransaction
}

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const pendingTransaction = await prisma.transaction.findFirst({
		where: {
			sellerId: userId,
			businessId: businessId,
			status: TransactionStatus.PENDING,
		},
		select: { id: true },
	})

	const transaction = pendingTransaction
		? await fetchTransactionDetails(pendingTransaction.id)
		: await createNewTransaction(userId, businessId)

	const availableItemDiscounts = transaction.itemTransactions.flatMap(
		itemTransaction =>
			itemTransaction.item.discounts.map(discount => discount.id),
	)

	const uniqueDiscountIds = [...new Set(availableItemDiscounts)]

	const availableDiscounts = await prisma.discount.findMany({
		where: { id: { in: uniqueDiscountIds }, isActive: true },
		select: { id: true, name: true },
	})

	return json({
		transaction,
		availableDiscounts,
	})
}

const SetPaymentMethodSchema = z.object({
	intent: z.string(),
	transactionId: z.string(),
	paymentMethod: PaymentMethodSchema,
})

const CompleteTransactionSchema = z.object({
	intent: z.string(),
	transactionId: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
	await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'set-payment-method') {
		const setPaymentResult = SetPaymentMethodSchema.safeParse({
			intent: formData.get('intent'),
			transactionId: formData.get('transactionId'),
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
		const { paymentMethod, transactionId } = setPaymentResult.data

		await prisma.transaction.update({
			where: { id: transactionId },
			data: { paymentMethod },
		})

		return json({ status: 'success' } as const)
	}

	if (intent === 'complete-transaction') {
		const completeTransactionResult = CompleteTransactionSchema.safeParse({
			intent: formData.get('intent'),
			transactionId: formData.get('transactionId'),
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
		const { transactionId } = completeTransactionResult.data
		await prisma.transaction.update({
			where: { id: transactionId },
			data: {
				status: TransactionStatus.FINISHED,
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

	const { transaction, availableDiscounts } = useLoaderData<typeof loader>()

	const currentPaymentMethod = PaymentMethodSchema.parse(
		transaction.paymentMethod,
	)

	let allItemTransactions = transaction.itemTransactions

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
		<div className="flex h-full flex-1  gap-12">
			<div className="flex-1 ">
				{/* //? I need to redo the item reader, change its width and add good feedback for when, for example, there is no stock or the item is not active */}
				<ItemReader ref={itemReaderRef} autoFocus autoSubmit status={'idle'} />
				<Spacer size="4xs" />
				<div className="flex flex-col gap-2  overflow-y-auto sm:max-h-[calc(100%-4rem)]">
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

			<div className="mx-auto  hidden w-[20rem] flex-col justify-between gap-4 xl:flex">
				<TransactionIdPanel transactionId={transaction.id} />
				<PaymentMethodPanel
					transactionId={transaction.id}
					currentPaymentMethod={currentPaymentMethod}
				/>
				<DiscountsPanel activeDiscounts={availableDiscounts} />
				<TransactionOverviewPanel
					subtotal={transaction.subtotal}
					discount={transaction.totalDiscount}
					total={transaction.total}
				/>

				<TransactionOptionsPanel
					transaction={TransactionDetailsSchema.parse(transaction)}
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
						<PaymentMethodPanel
							transactionId={transaction.id}
							currentPaymentMethod={currentPaymentMethod}
						/>
						<DiscountsPanel activeDiscounts={availableDiscounts} />
						<TransactionOverviewPanel
							subtotal={transaction.subtotal}
							discount={transaction.totalDiscount}
							total={transaction.total}
						/>

						<TransactionOptionsPanel
							transaction={TransactionDetailsSchema.parse(transaction)}
						/>
					</div>
					<DrawerFooter></DrawerFooter>
				</DrawerContent>
			</Drawer>
		</div>
	)
}
