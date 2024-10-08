import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { type Discount, type ProductOrder } from '@prisma/client'
import { json, redirect, type ActionFunctionArgs } from '@remix-run/node'
import {
	DeleteFormSchema,
	deleteProductOrderActionIntent,
} from '#app/components/pos/product-order/product-order-delete.tsx'
import {
	addProductOrderActionIntent,
	AddProductOrderSchema,
} from '#app/components/pos/product-order/product-order-new.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import {
	changeProductOrderQuantityActionIntent,
	ChangeProductOrderQuantitySchema,
	decreaseProductOrderQuantityActionIntent,
	DecreaseProductOrderQuantitySchema,
	increaseProductOrderQuantityActionIntent,
	IncreaseProductOrderQuantitySchema,
} from '../../components/pos/product-order/product-order-quantity.tsx'
import {
	updateProductOrderTypeActionIntent,
	UpdateProductOrderTypeSchema,
} from '../../components/pos/product-order/product-order-type.tsx'
import { DiscountApplicationMethod } from '../../types/discounts/discount-applicationMethod.ts'
import { DiscountScope } from '../../types/discounts/discount-scope.ts'
import { DiscountType } from '../../types/discounts/discount-type.ts'
import { OrderStatus } from '../../types/orders/order-status.ts'
import { ProductOrderType } from '../../types/orders/productOrderType.ts'

export async function loader() {
	return redirect('/pos')
}

//!Discounts may not be taking into account isActive!!!!!!!!!!!!!!!!!!!!!!!!!

type ProductOrderWithRelations = ProductOrder & {
	productDetails: {
		discounts: Discount[]
		sellingPrice: number
		stock: number
	}
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)
	const formData = await request.formData()

	const intent = formData.get('intent')

	invariantResponse(intent, 'Intent should be defined.')

	switch (intent) {
		case updateProductOrderTypeActionIntent: {
			return await updateProductOrderTypeAction({ formData })
		}

		case increaseProductOrderQuantityActionIntent: {
			return await increaseProductOrderQuantityAction({ formData })
		}
		case decreaseProductOrderQuantityActionIntent: {
			return await decreaseProductOrderQuantityAction({ formData })
		}
		case changeProductOrderQuantityActionIntent: {
			return await changeProductOrderQuantityAction({ formData })
		}

		case deleteProductOrderActionIntent: {
			return await deleteProductOrderAction({ formData })
		}
		case addProductOrderActionIntent: {
			return await addProductOrderAction({ formData, userId, businessId })
		}
	}
}

async function updateProductOrderTypeAction({
	formData,
}: {
	formData: FormData
}) {
	const result = UpdateProductOrderTypeSchema.safeParse({
		intent: formData.get('intent'),
		productOrderId: formData.get('productOrderId'),
		productOrderType: formData.get('productOrderType'),
	})

	if (!result.success) {
		const errors = result.error.flatten()
		return json({ status: 'error', errors } as const, { status: 400 })
	}

	const { productOrderId, productOrderType } = result.data

	const currentProductOrder = (await prisma.productOrder.findUniqueOrThrow({
		where: { id: productOrderId },
		select: {
			totalPrice: true,
			quantity: true,
			productDetails: { select: { discounts: true, sellingPrice: true } },
		},
	})) as ProductOrderWithRelations

	const { totalPrice, totalDiscount } = await calculateTotals(
		currentProductOrder,
		productOrderType,
	)

	await prisma.productOrder.update({
		where: { id: productOrderId },
		data: {
			type: productOrderType,
			totalPrice,
			totalDiscount,
		},
	})

	return json({ status: 'ok' } as const, { status: 200 })
}

async function increaseProductOrderQuantityAction({
	formData,
}: {
	formData: FormData
}) {
	const result = IncreaseProductOrderQuantitySchema.safeParse({
		intent: formData.get('intent'),
		productOrderId: formData.get('productOrderId'),
	})

	if (!result.success) {
		const errors = result.error.flatten()
		return json({ status: 'error', errors } as const, { status: 400 })
	}

	const { productOrderId } = result.data

	const currentProductOrder = (await prisma.productOrder.findUniqueOrThrow({
		where: { id: productOrderId },
		select: {
			type: true,
			totalPrice: true,
			productDetails: { select: { discounts: true, sellingPrice: true } },
			quantity: true,
		},
	})) as ProductOrderWithRelations

	const { totalPrice, totalDiscount } = await calculateTotals(
		{ ...currentProductOrder, quantity: currentProductOrder.quantity + 1 },
		currentProductOrder.type as ProductOrderType,
	)

	await prisma.productOrder.update({
		where: { id: productOrderId },
		data: {
			quantity: { increment: 1 },
			totalPrice,
			totalDiscount,
		},
	})

	return json({ status: 'ok' } as const, { status: 200 })
}
async function decreaseProductOrderQuantityAction({
	formData,
}: {
	formData: FormData
}) {
	const result = DecreaseProductOrderQuantitySchema.safeParse({
		intent: formData.get('intent'),
		productOrderId: formData.get('productOrderId'),
	})

	if (!result.success) {
		const errors = result.error.flatten()
		return json({ status: 'error', errors } as const, { status: 400 })
	}

	const { productOrderId } = result.data

	const currentProductOrder = (await prisma.productOrder.findUniqueOrThrow({
		where: { id: productOrderId },
		select: {
			type: true,
			totalPrice: true,
			productDetails: { select: { discounts: true, sellingPrice: true } },
			quantity: true,
		},
	})) as ProductOrderWithRelations

	if (currentProductOrder.quantity - 1 < 0) {
		return json({ status: 'error' } as const, { status: 200 })
	}

	const { totalPrice, totalDiscount } = await calculateTotals(
		{ ...currentProductOrder, quantity: currentProductOrder.quantity - 1 },
		currentProductOrder.type as ProductOrderType,
	)

	await prisma.productOrder.update({
		where: { id: productOrderId },
		data: {
			quantity: { decrement: 1 },
			totalPrice,
			totalDiscount,
		},
	})

	return json({ status: 'ok' } as const, { status: 200 })
}

export type changeProductOrderQuantityActionType =
	typeof changeProductOrderQuantityAction

async function changeProductOrderQuantityAction({
	formData,
}: {
	formData: FormData
}) {
	const result = ChangeProductOrderQuantitySchema.safeParse({
		intent: formData.get('intent'),
		productOrderId: formData.get('productOrderId'),
		productOrderQuantity: Number(formData.get('productOrderQuantity')),
	})

	if (!result.success) {
		const errors = result.error.flatten()
		return json({ status: 'error', errors } as const, { status: 400 })
	}

	const { productOrderId, productOrderQuantity } = result.data

	const currentProductOrder = (await prisma.productOrder.findUniqueOrThrow({
		where: { id: productOrderId },
		select: {
			type: true,
			totalPrice: true,
			productDetails: {
				select: { discounts: true, sellingPrice: true, stock: true },
			},
			quantity: true,
		},
	})) as ProductOrderWithRelations

	const prevQuantity = currentProductOrder.quantity
	const isOverStock =
		productOrderQuantity > currentProductOrder.productDetails.stock
	const checkedQuantity = isOverStock ? prevQuantity : productOrderQuantity

	if (prevQuantity !== productOrderQuantity) {
		const { totalPrice, totalDiscount } = await calculateTotals(
			{ ...currentProductOrder, quantity: checkedQuantity },
			currentProductOrder.type as ProductOrderType,
		)

		await prisma.productOrder.update({
			where: { id: productOrderId },
			data: {
				quantity: checkedQuantity,
				totalPrice,
				totalDiscount,
			},
		})
	}

	return json({ status: isOverStock ? 'over' : 'ok' } as const, { status: 200 })
}

async function calculateTotals(
	productOrder: ProductOrderWithRelations,
	productOrderType: ProductOrderType,
) {
	let totalPrice =
		productOrder.productDetails.sellingPrice * productOrder.quantity
	let totalDiscountToApply = 0

	const allDiscounts = [
		...productOrder.productDetails.discounts,
		...(await getGlobalDiscounts()),
	]

	for (let discount of allDiscounts) {
		totalDiscountToApply += calculateDiscountValue(
			discount,
			productOrder,
			productOrder.productDetails.sellingPrice,
		)
	}

	if (productOrderType === ProductOrderType.RETURN) {
		totalPrice = Math.abs(totalPrice) * -1
	} else {
		totalPrice = Math.abs(totalPrice)
	}

	if (productOrderType === ProductOrderType.PROMO) {
		totalPrice -= totalDiscountToApply
	}

	return { totalPrice, totalDiscount: totalDiscountToApply }
}

function calculateDiscountValue(
	discount: Pick<
		Discount,
		'value' | 'type' | 'applicationMethod' | 'minimumQuantity'
	>,
	productOrder: Pick<ProductOrder, 'quantity'>,
	productSellingPrice: number,
) {
	let discountTotalValue = 0
	const isEligibleForDiscount =
		productOrder.quantity >= discount.minimumQuantity

	if (isEligibleForDiscount) {
		if (discount.type === DiscountType.FIXED) {
			if (discount.applicationMethod === DiscountApplicationMethod.BY_PRODUCT) {
				discountTotalValue = productOrder.quantity * discount.value
			}
			if (discount.applicationMethod === DiscountApplicationMethod.TO_TOTAL) {
				discountTotalValue = discount.value
			}
		}
		if (discount.type === DiscountType.PERCENTAGE) {
			discountTotalValue =
				(productOrder.quantity * productSellingPrice * discount.value) / 100
		}
	}

	return discountTotalValue
}
async function getGlobalDiscounts() {
	return await prisma.discount.findMany({
		where: { scope: DiscountScope.GLOBAL },
	})
}
export type deleteProductOrderActionType = typeof deleteProductOrderAction
async function deleteProductOrderAction({ formData }: { formData: FormData }) {
	const submission = parseWithZod(formData, {
		schema: DeleteFormSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { productOrderId } = submission.value

	const productOrder = await prisma.productOrder.findFirst({
		select: { id: true },
		where: { id: productOrderId },
	})

	invariantResponse(
		productOrder,
		'El producto no existe en la transacción actual',
		{ status: 404 },
	)

	await prisma.productOrder.delete({ where: { id: productOrder.id } })

	return json({ result: submission.reply() })
}

export type addProductOrderActionType = typeof addProductOrderAction
async function addProductOrderAction({
	formData,
	userId,
	businessId,
}: {
	formData: FormData
	userId: string
	businessId: string
}) {
	const currentOrder = await prisma.order.findFirst({
		where: {
			sellerId: userId,
			businessId: businessId,
			status: OrderStatus.PENDING,
		},
		select: {
			id: true,
			_count: { select: { productOrders: true } },
		},
	})

	invariantResponse(currentOrder, 'Debe haber una transacción en progreso.')

	//set the createdAt again for a more accurate transaction time duration only if current order does not have product Orders attached yet.
	const shouldUpdateCreatedAt = currentOrder._count.productOrders === 0

	if (shouldUpdateCreatedAt) {
		await prisma.order.update({
			where: { id: currentOrder.id },
			data: {
				createdAt: new Date(),
			},
		})
	}

	const result = AddProductOrderSchema.safeParse({
		intent: formData.get('intent'),
		search: formData.get('search'),
	})

	if (!result.success) {
		return json(
			{
				status: 'error',
				errors: result.error.flatten(),
				message: 'error',
			} as const,
			{
				status: 400,
			},
		)
	}
	const { search } = result.data

	const product = await prisma.product.findFirst({
		where: { code: search, businessId, isDeleted: false },
		select: {
			name: true,
			id: true,
			sellingPrice: true,
			stock: true,
			isActive: true,

			code: true,
		},
	})

	if (!product) {
		return json({
			status: 'error',
			message: `Articulo código [${search}] no se encuentra en el registro de inventario.`,
		} as const)
	}

	if (!product.isActive) {
		return json({
			status: 'error',
			message: `Articulo [${product.name}] no se encuentra habilitado para comercio.`,
		} as const)
	}

	const productOrder = await prisma.productOrder.findFirst({
		where: {
			orderId: currentOrder.id,
			productId: product.id,
		},
		include: { productDetails: { include: { discounts: true } } },
	})

	if (productOrder) {
		const { totalPrice, totalDiscount } = await calculateTotals(
			{ ...productOrder, quantity: productOrder.quantity + 1 },
			productOrder.type as ProductOrderType,
		)

		await prisma.productOrder.update({
			where: { id: productOrder.id },
			data: {
				quantity: { increment: 1 },
				totalPrice,
				totalDiscount,
			},
		})

		return json({
			status: 'success',
			message: `Articulo código agregado con éxito`,
		} as const)
	}

	//Create the default productOrder
	const createdProductOrder = await prisma.productOrder.create({
		data: {
			type: ProductOrderType.SELL,
			productDetails: { connect: { id: product.id } },
			order: { connect: { id: currentOrder.id } },
			quantity: 1,
			totalPrice: product.sellingPrice,
			totalDiscount: 0,
		},
		select: {
			id: true,
			type: true,
			quantity: true,
			totalDiscount: true,
			productDetails: {
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

	//!SHOULD CHECK STOCK COMPARED TO CURRENT PRODUCT ORDER QUANTITY
	if (createdProductOrder.productDetails.stock < 1) {
		return json({
			status: 'warn',
			message: `Articulo "${createdProductOrder.productDetails.name}" se encuentra sin stock.`,
		} as const)
	}

	return json({
		status: 'success',
		message: `Articulo código [${createdProductOrder.productDetails.code}] agregado con éxito`,
	} as const)
}
