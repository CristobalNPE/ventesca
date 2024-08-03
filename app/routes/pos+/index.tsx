import { invariantResponse } from '@epic-web/invariant'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	MetaFunction,
	useFetchers,
	useLoaderData,
	useRevalidator,
} from '@remix-run/react'

import { Spacer } from '#app/components/spacer.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { useEffect, useRef } from 'react'
// import { updateDiscountValidity } from '../_discounts+/discounts_.$discountId.tsx'
import { OrderDetailsSchema } from '../../types/orders/OrderData.ts'
import { PaymentMethodSchema } from '../../types/orders/payment-method.ts'
import {
	applyDirectDiscountActionIntent,
	removeDirectDiscountActionIntent,
} from './__direct-discount.tsx'
import { discardOrderActionIntent } from './__discard-order.tsx'
import { finishOrderActionIntent } from './__finish-order.tsx'
import {
	addProductOrderActionIntent,
	ProductReader,
} from './__productOrder+/__product-order-new.tsx'
import {
	PaymentMethodPanel,
	setPaymentMethodActionIntent,
} from './__set-payment-method.tsx'
import {
	DiscountsPanel,
	OrderIdPanel,
	OrderOptionsPanel,
	OrderOverviewPanel,
} from './order-panel.tsx'

import { useRoveFocus } from '#app/hooks/useRoveFocus.ts'
import { ProductOrder } from './__productOrder+/ProductOrder.tsx'
import {
	applyDirectDiscountAction,
	discardOrderAction,
	finishOrderAction,
	removeDirectDiscountAction,
	setPaymentMethodAction,
} from './pos-actions.server.ts'
import {
	createNewOrder,
	fetchAvailableDiscounts,
	fetchCurrentPendingOrder,
	fetchOrderDetails,
} from './pos-service.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const pendingOrder = await fetchCurrentPendingOrder(userId, businessId)

	const order = pendingOrder
		? await fetchOrderDetails(pendingOrder.id)
		: await createNewOrder(userId, businessId)

	const { availableDiscounts, globalDiscounts } = await fetchAvailableDiscounts(
		order.id,
	)

	return json({
		order,
		availableDiscounts,
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

export default function ProcessOrderRoute() {
	const { order, availableDiscounts, globalDiscounts } =
		useLoaderData<typeof loader>()

	const currentPaymentMethod = PaymentMethodSchema.parse(order.paymentMethod)
	const productReaderRef = useRef<HTMLInputElement>(null)
	productReaderRef.current?.focus()

	let allProductOrders = order.productOrders

	const createProductOrderFetcherSubmitting = useFetchers()
		.filter(fetcher => fetcher.key.includes(addProductOrderActionIntent))
		.some(fetcher => fetcher.state !== 'idle')

	const revalidator = useRevalidator()
	useEffect(() => {
		if (!createProductOrderFetcherSubmitting) {
			revalidator.revalidate()
		}
	}, [createProductOrderFetcherSubmitting])

	const [focus, setFocus] = useRoveFocus(allProductOrders.length ?? 0)

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

export const meta: MetaFunction = () => {
	return [{ title: 'Ventesca | Transacción en curso' }]
}
