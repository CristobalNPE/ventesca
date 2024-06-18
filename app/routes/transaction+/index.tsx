import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'

import React, { createRef, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { Spacer } from '#app/components/spacer.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { DiscountScope } from '../_discounts+/_types/discount-reach.ts'
import { DiscountType } from '../_discounts+/_types/discount-type.ts'
// import { updateDiscountValidity } from '../_discounts+/discounts_.$discountId.tsx'
import { ItemReader } from '../_system+/item-transaction.new.tsx'
import {
	APPLY_DIRECT_DISCOUNT_KEY,
	DirectDiscountSchema,
	REMOVE_DIRECT_DISCOUNT_KEY,
	RemoveDirectDiscountSchema,
} from './__direct-discount.tsx'
import { ItemProps, ItemTransaction } from './_components/itemTransaction.tsx'
import { PaymentMethod, PaymentMethodSchema } from './_types/payment-method.ts'

import { OrderStatus } from './_types/order-status.ts'
import { TransactionDetailsSchema } from './_types/TransactionData.ts'
import { ItemTransactionType } from './_types/item-transactionType.ts'
import {
	DiscountsPanel,
	TransactionIdPanel,
	TransactionOptionsPanel,
	TransactionOverviewPanel,
} from './transaction-panel.tsx'


import {
	DISCARD_TRANSACTION_KEY,
	DiscardTransactionSchema,
} from './__discard-transaction.tsx'
import {
	FINISH_TRANSACTION_KEY,
	FinishTransactionSchema,
} from './__finish-transaction.tsx'
import {
	PaymentMethodPanel,
	SET_TRANSACTION_PAYMENT_METHOD_KEY,
	SetPaymentMethodSchema,
} from './__set-payment-method.tsx'

const transactionDetailsSelect = {
	id: true,
	status: true,
	createdAt: true,
	paymentMethod: true,
	totalDiscount: true,
	directDiscount: true,
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

const discountDetailsSelect = {
	id: true,
	name: true,
	description: true,
	applicationMethod: true,
	type: true,
	scope: true,
	minimumQuantity: true,
	validFrom: true,
	validUntil: true,
	value: true,
	isActive: true,
}

async function createNewTransaction(userId: string, businessId: string) {
	const newTransaction = await prisma.transaction.create({
		data: {
			seller: { connect: { id: userId } },
			status: OrderStatus.PENDING,
			paymentMethod: PaymentMethod.CASH,
			totalDiscount: 0,
			directDiscount: 0,
			subtotal: 0,
			total: 0,
			business: { connect: { id: businessId } },
		},
		select: transactionDetailsSelect,
	})

	return newTransaction
}

async function fetchTransactionDetails(transactionId: string) {
	const transaction = await prisma.transaction.findUniqueOrThrow({
		where: { id: transactionId },
		select: transactionDetailsSelect,
	})

	//update totals before serving to front end
	const discount = transaction.itemTransactions
		.filter(
			itemTransaction => itemTransaction.type === ItemTransactionType.PROMO,
		)
		.reduce((acc, itemTransaction) => acc + itemTransaction.totalDiscount, 0)

	const total =
		transaction.itemTransactions.reduce(
			(acc, itemTransaction) => acc + itemTransaction.totalPrice,
			0,
		) - transaction.directDiscount

	const subtotal = total + discount + transaction.directDiscount

	const updatedTransaction = await prisma.transaction.update({
		where: { id: transactionId },
		data: {
			totalDiscount: discount,
			total: total,
			subtotal: subtotal,
		},
		select: transactionDetailsSelect,
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
			status: OrderStatus.PENDING,
		},
		select: { id: true },
	})

	const transaction = pendingTransaction
		? await fetchTransactionDetails(pendingTransaction.id)
		: await createNewTransaction(userId, businessId)

	const availableItemDiscounts = transaction.itemTransactions.flatMap(
		itemTransaction =>
			itemTransaction.item.discounts
				.filter(
					discount => itemTransaction.quantity >= discount.minimumQuantity,
				)
				.map(discount => discount.id),
	)

	const uniqueDiscountIds = [...new Set(availableItemDiscounts)]

	const availableDiscounts = await prisma.discount.findMany({
		where: { id: { in: uniqueDiscountIds }, isActive: true },
		select: discountDetailsSelect,
	})

	const globalDiscounts = await prisma.discount.findMany({
		where: { scope: DiscountScope.GLOBAL },
		select: discountDetailsSelect,
	})

	const allDiscounts = [...availableDiscounts, ...globalDiscounts]

	// for (let discount of allDiscounts) {
	// 	await updateDiscountValidity(discount)
	// }

	return json({
		transaction,
		availableDiscounts: allDiscounts,
		globalDiscounts,
	})
}

export async function action({ request }: ActionFunctionArgs) {
	await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')

	invariantResponse(intent, 'Intent should be defined.')

	switch (intent) {
		case DISCARD_TRANSACTION_KEY: {
			return await handleDiscardTransaction(formData)
		}
		case SET_TRANSACTION_PAYMENT_METHOD_KEY: {
			return await handleSetPaymentMethod(formData)
		}
		case FINISH_TRANSACTION_KEY: {
			return await handleFinishTransaction(formData)
		}
		case APPLY_DIRECT_DISCOUNT_KEY: {
			return await handleDirectDiscount(formData)
		}
		case REMOVE_DIRECT_DISCOUNT_KEY: {
			return await handleRemoveDirectDiscount(formData)
		}
	}
}

export default function TransactionRoute() {
	const { transaction, availableDiscounts, globalDiscounts } =
		useLoaderData<typeof loader>()

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
				<ItemReader ref={itemReaderRef} autoFocus autoSubmit status={'idle'} />
				<Spacer size="4xs" />
				{allItemTransactions.length > 0 ? (
					<div className="no-scrollbar flex flex-col gap-2 overflow-y-auto sm:max-h-[calc(100%-4rem)]">
						{allItemTransactions.map((itemTransaction, index) => {
							if (itemTransaction.item) {
								return (
									<ItemTransaction
										itemTransaction={itemTransaction}
										globalDiscounts={globalDiscounts}
										key={itemTransaction.item.id}
										item={itemTransaction.item as SerializeFrom<ItemProps>}
										itemReaderRef={itemReaderRef}
										ref={itemRefs.current[index]}
									/>
								)
							} else return null
						})}
					</div>
				) : (
					<div className=" no-scrollbar flex h-[calc(100%-4rem)] flex-col items-center justify-center gap-2  rounded-md  border-2 border-dashed  p-6 text-xl font-semibold text-muted-foreground">
						<Icon className="text-2xl" name="scan" />
						<h1 className="text-balance text-center">
							Ingrese el código de articulo para agregarlo a la transacción en
							curso.
						</h1>
					</div>
				)}
			</div>

			<div className="mx-auto  hidden w-[20rem] flex-col justify-between gap-4 xl:flex">
				<TransactionIdPanel transactionId={transaction.id} />
				<PaymentMethodPanel
					transactionId={transaction.id}
					currentPaymentMethod={currentPaymentMethod}
				/>
				<DiscountsPanel
					activeDiscounts={availableDiscounts}
					transactionId={transaction.id}
					transactionTotal={transaction.total}
					directDiscount={transaction.directDiscount}
				/>
				<TransactionOverviewPanel
					subtotal={transaction.subtotal}
					discount={transaction.totalDiscount + transaction.directDiscount}
					total={transaction.total}
				/>

				<TransactionOptionsPanel
					transaction={TransactionDetailsSchema.parse(transaction)}
				/>
			</div>
		</div>
	)
}

async function handleDiscardTransaction(formData: FormData) {
	const submission = parseWithZod(formData, {
		schema: DiscardTransactionSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { transactionId } = submission.value

	const transaction = await prisma.transaction.findUniqueOrThrow({
		select: { id: true },
		where: { id: transactionId },
	})

	await prisma.transaction.update({
		where: { id: transaction.id },
		data: {
			isDiscarded: true,
			status: OrderStatus.DISCARDED,
			completedAt: new Date(),
		},
	})
	return redirectWithToast(`/reports`, {
		type: 'message',
		title: 'Transacción Descartada',
		description: `Transacción ${transaction.id} ha sido descartada.`,
	})
}

async function handleSetPaymentMethod(formData: FormData) {
	const submission = await parseWithZod(formData, {
		schema: SetPaymentMethodSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { transactionId, paymentMethod } = submission.value

	await prisma.transaction.update({
		where: { id: transactionId },
		data: { paymentMethod },
	})

	return json({ result: submission.reply() })
}

async function handleFinishTransaction(formData: FormData) {
	const submission = await parseWithZod(formData, {
		schema: FinishTransactionSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { transactionId } = submission.value

	const transaction = await prisma.transaction.update({
		where: { id: transactionId },
		data: {
			status: OrderStatus.FINISHED,
			completedAt: new Date(),
		},
		select: { itemTransactions: true, status: true },
	})

	//update analytics for every item involved in the transaction
	for (let itemTransaction of transaction.itemTransactions) {
		if (transaction.status === OrderStatus.FINISHED) {
			await prisma.itemAnalytics.upsert({
				where: { itemId: itemTransaction.itemId },
				update: {
					totalProfit: { increment: itemTransaction.totalPrice },
					totalSales:
						itemTransaction.type === ItemTransactionType.RETURN
							? { decrement: itemTransaction.quantity }
							: { increment: itemTransaction.quantity },
				},
				create: {
					item: { connect: { id: itemTransaction.itemId } },
					totalProfit: itemTransaction.totalPrice,
					totalSales: itemTransaction.quantity,
				},
			})
		}
	}

	return redirectWithToast(`/reports/${transactionId}`, {
		type: 'success',
		title: 'Transacción Completa',
		description: `Venta completada bajo ID de transacción: [${transactionId.toUpperCase()}].`,
	})
}

async function handleDirectDiscount(formData: FormData) {
	const submission = await parseWithZod(formData, {
		schema: DirectDiscountSchema.superRefine(async (data, ctx) => {
			const currentTransaction = await prisma.transaction.findUniqueOrThrow({
				where: { id: data.transactionId },
				select: { total: true },
			})

			//El valor del descuento cuando es fijo, no puede ser mayor al total de la transacción.
			if (
				data.discountType === DiscountType.FIXED &&
				data.discountValue > currentTransaction.total
			) {
				ctx.addIssue({
					path: ['discountValue'],
					code: z.ZodIssueCode.custom,
					message: `El descuento no puede superar el valor total ( ${formatCurrency(
						currentTransaction.total,
					)} )`,
				})
			}

			//Si el descuento es porcentual, el valor debe estar entre 1 y 100
			if (
				data.discountType === DiscountType.PERCENTAGE &&
				!(data.discountValue >= 1 && data.discountValue <= 100)
			) {
				ctx.addIssue({
					path: ['discountValue'],
					code: z.ZodIssueCode.custom,
					message: 'Un descuento porcentual debe estar entre 1% y 100%.',
				})
			}
		}),
		async: true,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { transactionId, totalDirectDiscount } = submission.value

	await prisma.transaction.update({
		where: { id: transactionId },
		data: { directDiscount: totalDirectDiscount },
	})

	return json({ result: submission.reply() })
}

async function handleRemoveDirectDiscount(formData: FormData) {
	const submission = await parseWithZod(formData, {
		schema: RemoveDirectDiscountSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { transactionId } = submission.value

	await prisma.transaction.update({
		where: { id: transactionId },
		data: { directDiscount: 0 },
	})

	return json({ result: submission.reply() })
}
