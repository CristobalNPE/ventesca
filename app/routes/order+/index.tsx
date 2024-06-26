import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { type ProductOrder as ProductOrderModel } from '@prisma/client'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { useLoaderData, useSubmit } from '@remix-run/react'

import { Spacer } from '#app/components/spacer.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { useRef, useState } from 'react'
import { z } from 'zod'
import { DiscountScope } from '../_discounts+/_types/discount-reach.ts'
import { DiscountType } from '../_discounts+/_types/discount-type.ts'
// import { updateDiscountValidity } from '../_discounts+/discounts_.$discountId.tsx'
import {
	applyDirectDiscountActionIntent,
	DirectDiscountSchema,
	removeDirectDiscountActionIntent,
	RemoveDirectDiscountSchema,
} from './__direct-discount.tsx'
import {
	discardOrderActionIntent,
	DiscardOrderSchema,
} from './__discard-order.tsx'
import {
	finishOrderActionIntent,
	FinishTransactionSchema,
} from './__finish-order.tsx'
import { ProductReader } from './__productOrder+/__product-order-new.tsx'
import {
	PaymentMethodPanel,
	setPaymentMethodActionIntent,
	SetPaymentMethodSchema,
} from './__set-payment-method.tsx'
import { OrderStatus } from './_types/order-status.ts'
import { OrderDetailsSchema } from './_types/OrderData.ts'
import { PaymentMethod, PaymentMethodSchema } from './_types/payment-method.ts'
import { ProductOrderType } from './_types/productOrderType.ts'
import {
	DiscountsPanel,
	OrderIdPanel,
	OrderOptionsPanel,
	OrderOverviewPanel,
} from './order-panel.tsx'

import { useMemo } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Key } from 'ts-key-enum'
import { ProductOrder } from './__productOrder+/ProductOrder.tsx'

const orderDetailsSelect = {
	id: true,
	status: true,
	createdAt: true,
	paymentMethod: true,
	totalDiscount: true,
	directDiscount: true,
	total: true,
	subtotal: true,
	seller: { select: { name: true } },
	productOrders: {
		select: {
			id: true,
			type: true,
			quantity: true,
			totalPrice: true,
			totalDiscount: true,
			productDetails: {
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

async function createNewOrder(userId: string, businessId: string) {
	const newOrder = await prisma.order.create({
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
		select: orderDetailsSelect,
	})

	return newOrder
}

async function fetchOrderDetails(orderId: string) {
	const order = await prisma.order.findUniqueOrThrow({
		where: { id: orderId },
		select: orderDetailsSelect,
	})

	//update totals before serving to front end
	const discount = order.productOrders
		.filter(productOrder => productOrder.type === ProductOrderType.PROMO)
		.reduce((acc, productOrder) => acc + productOrder.totalDiscount, 0)

	const total =
		order.productOrders.reduce(
			(acc, productOrder) => acc + productOrder.totalPrice,
			0,
		) - order.directDiscount

	const subtotal = total + discount + order.directDiscount

	const updatedOrder = await prisma.order.update({
		where: { id: orderId },
		data: {
			totalDiscount: discount,
			total: total,
			subtotal: subtotal,
		},
		select: orderDetailsSelect,
	})

	return updatedOrder
}

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const pendingOrder = await prisma.order.findFirst({
		where: {
			sellerId: userId,
			businessId: businessId,
			status: OrderStatus.PENDING,
		},
		select: { id: true },
	})

	const order = pendingOrder
		? await fetchOrderDetails(pendingOrder.id)
		: await createNewOrder(userId, businessId)

	const availableProductDiscounts = order.productOrders.flatMap(productOrder =>
		productOrder.productDetails.discounts
			.filter(discount => productOrder.quantity >= discount.minimumQuantity)
			.map(discount => discount.id),
	)

	const uniqueDiscountIds = [...new Set(availableProductDiscounts)]

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
		order,
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
		case discardOrderActionIntent: {
			return await discardOrderAction(formData)
		}
		case setPaymentMethodActionIntent: {
			return await setPaymentMethodAction(formData)
		}
		case finishOrderActionIntent: {
			return await finishOrderAction(formData)
		}
		case applyDirectDiscountActionIntent: {
			return await applyDirectDiscountAction(formData)
		}
		case removeDirectDiscountActionIntent: {
			return await removeDirectDiscountAction(formData)
		}
	}
}

export default function TransactionRoute() {
	const { order, availableDiscounts, globalDiscounts } =
		useLoaderData<typeof loader>()

	const currentPaymentMethod = PaymentMethodSchema.parse(order.paymentMethod)
	const productReaderRef = useRef<HTMLInputElement>(null)
	productReaderRef.current?.focus()

	let allProductOrders = order.productOrders
	const [focus, setFocus] = useRoveFocus(allProductOrders.length ?? 0)

	// //KB Shortcuts
	// const submit = useSubmit()
	// useHotkeys(
	// 	[Key.E],
	// 	event => {
	// 		switch (event.key) {
	// 			case `alt+return`: {
	// 				submit(
	// 					{
	// 						intent: finishOrderActionIntent,
	// 						orderId: order.id,
	// 					},
	// 					{ method: 'POST', action: '/order' },
	// 				)
	// 				break
	// 			}
	// 		}
	// 	},
	// 	{ preventDefault: true },
	// )

	return (
		<div className="flex h-full flex-1  gap-12">
			<div className="flex-1 ">
				<ProductReader
					ref={productReaderRef}
					autoFocus
					autoSubmit
					status={'idle'}
				/>
				<Spacer size="4xs" />
				{allProductOrders.length > 0 ? (
					<div
						role="list"
						className="no-scrollbar flex flex-col gap-2 overflow-y-auto sm:max-h-[calc(100%-4rem)]"
					>
						{allProductOrders.map((productOrder, index) => (
							<ProductOrder
								key={productOrder.id}
								index={index}
								focus={focus === index}
								setFocus={setFocus}
								productOrder={productOrder}
								globalDiscounts={globalDiscounts}
							/>
						))}
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
				<OrderIdPanel orderId={order.id} />
				<PaymentMethodPanel
					orderId={order.id}
					currentPaymentMethod={currentPaymentMethod}
				/>
				<DiscountsPanel
					activeDiscounts={availableDiscounts}
					orderId={order.id}
					orderTotal={order.total}
					directDiscount={order.directDiscount}
				/>
				<OrderOverviewPanel
					subtotal={order.subtotal}
					discount={order.totalDiscount + order.directDiscount}
					total={order.total}
				/>

				<OrderOptionsPanel order={OrderDetailsSchema.parse(order)} />
			</div>
		</div>
	)
}

async function discardOrderAction(formData: FormData) {
	const submission = parseWithZod(formData, {
		schema: DiscardOrderSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { orderId } = submission.value

	const order = await prisma.order.findUniqueOrThrow({
		select: { id: true },
		where: { id: orderId },
	})

	await prisma.order.update({
		where: { id: order.id },
		data: {
			isDiscarded: true,
			status: OrderStatus.DISCARDED,
			completedAt: new Date(),
		},
	})
	return redirectWithToast(`/reports`, {
		type: 'message',
		title: 'Transacción Descartada',
		description: `Transacción ${order.id} ha sido descartada.`,
	})
}

async function setPaymentMethodAction(formData: FormData) {
	const submission = await parseWithZod(formData, {
		schema: SetPaymentMethodSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { orderId, paymentMethod } = submission.value

	await prisma.order.update({
		where: { id: orderId },
		data: { paymentMethod },
	})

	return json({ result: submission.reply() })
}

async function finishOrderAction(formData: FormData) {
	const submission = await parseWithZod(formData, {
		schema: FinishTransactionSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { orderId } = submission.value

	const order = await prisma.order.update({
		where: { id: orderId },
		data: {
			status: OrderStatus.FINISHED,
			completedAt: new Date(),
		},
		select: { productOrders: true, status: true },
	})

	//update stock for products in the order
	await updateProductsStock(order.productOrders)

	return redirectWithToast(`/reports/${orderId}`, {
		type: 'success',
		title: 'Transacción Completa',
		description: `Venta completada bajo ID de transacción: [${orderId.toUpperCase()}].`,
	})
}

async function updateProductsStock(productOrders: ProductOrderModel[]) {
	for (let productOrder of productOrders) {
		const product = await prisma.product.findUniqueOrThrow({
			where: { id: productOrder.productId },
			select: { stock: true },
		})

		if (productOrder.type === ProductOrderType.RETURN) {
			await prisma.product.update({
				where: { id: productOrder.productId },
				data: {
					stock: { increment: productOrder.quantity },
				},
			})
		} else {
			const newStock = product.stock - productOrder.quantity
			await prisma.product.update({
				where: { id: productOrder.productId },
				data: {
					stock: { set: Math.max(newStock, 0) },
				},
			})
		}
	}
}

async function applyDirectDiscountAction(formData: FormData) {
	const submission = await parseWithZod(formData, {
		schema: DirectDiscountSchema.superRefine(async (data, ctx) => {
			const currentOrder = await prisma.order.findUniqueOrThrow({
				where: { id: data.orderId },
				select: { total: true },
			})

			//El valor del descuento cuando es fijo, no puede ser mayor al total de la transacción.
			if (
				data.discountType === DiscountType.FIXED &&
				data.discountValue > currentOrder.total
			) {
				ctx.addIssue({
					path: ['discountValue'],
					code: z.ZodIssueCode.custom,
					message: `El descuento no puede superar el valor total ( ${formatCurrency(
						currentOrder.total,
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

	const { orderId, totalDirectDiscount } = submission.value

	await prisma.order.update({
		where: { id: orderId },
		data: { directDiscount: totalDirectDiscount },
	})

	return json({ result: submission.reply() })
}

async function removeDirectDiscountAction(formData: FormData) {
	const submission = await parseWithZod(formData, {
		schema: RemoveDirectDiscountSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { orderId } = submission.value

	await prisma.order.update({
		where: { id: orderId },
		data: { directDiscount: 0 },
	})

	return json({ result: submission.reply() })
}

const useRoveFocus = (size: number) => {
	const [currentFocus, setCurrentFocus] = useState(0)

	useHotkeys(Key.ArrowDown, () =>
		setCurrentFocus(currentFocus === size - 1 ? 0 : currentFocus + 1),
	)
	useHotkeys(Key.ArrowUp, () =>
		setCurrentFocus(currentFocus === 0 ? size - 1 : currentFocus - 1),
	)

	return useMemo(() => [currentFocus, setCurrentFocus] as const, [currentFocus])
}
