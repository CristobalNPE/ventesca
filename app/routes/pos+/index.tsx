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
	useLocation,
	useRevalidator,
} from '@remix-run/react'

import { Spacer } from '#app/components/spacer.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { useEffect, useRef } from 'react'
// import { updateDiscountValidity } from '../_discounts+/discounts_.$discountId.tsx'
import {
	applyDirectDiscountActionIntent,
	removeDirectDiscountActionIntent,
} from '../../components/pos/current-order-direct-discount.tsx'
import { discardOrderActionIntent } from '../../components/pos/current-order-discard.tsx'
import { finishOrderActionIntent } from '../../components/pos/current-order-finish.tsx'

import { setPaymentMethodActionIntent } from '../../components/pos/current-order-payment-method.tsx'

import { CurrentOrderPlaceholder } from '#app/components/pos/current-order-placeholder.tsx'
import { CurrentOrderProducts } from '#app/components/pos/current-order-products.tsx'
import { CurrentOrderSettingsPanel } from '#app/components/pos/current-order-settings-panel.tsx'
import {
	addProductOrderActionIntent,
	ProductReader,
} from '#app/components/pos/product-order/product-order-new.tsx'
import { CurrentPendingOrderProvider } from '#app/context/pos/CurrentPendingOrderContext.tsx'
import {
	applyDirectDiscountAction,
	deleteOrderAction,
	discardOrderAction,
	finishOrderAction,
	modifyOrderAction,
	removeDirectDiscountAction,
	setPaymentMethodAction,
} from './pos-actions.server.ts'
import {
	createNewOrder,
	fetchAvailableDiscounts,
	fetchCurrentPendingOrder,
	fetchOrderDetails,
} from './pos-service.server.ts'

import { useHotkeys } from 'react-hotkeys-hook'
import { Key } from 'ts-key-enum'
import { modifyOrderActionIntent } from '#app/components/pos/current-order-modify.tsx'
import { deleteOrderActionIntent } from '#app/components/pos/current-order-delete.tsx'
import { ContentLayout } from '#app/components/layout/content-layout.tsx'

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
	const userId = await requireUserId(request)
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
		case modifyOrderActionIntent: {
			return await modifyOrderAction({ formData, sellerId: userId })
		}
		case deleteOrderActionIntent: {
			return await deleteOrderAction(formData)
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
	const loaderData = useLoaderData<typeof loader>()

	const productReaderRef = useRef<HTMLInputElement>(null)

	//focus only if just arrived at the page
	const location = useLocation()

	useEffect(() => {
		// Small delay to ensure the component is fully rendered
		const timeoutId = setTimeout(() => {
			productReaderRef.current?.focus()
		}, 0)

		// Cleanup the timeout to avoid memory leaks
		return () => clearTimeout(timeoutId)
	}, [location.pathname, loaderData.order.productOrders.length])

	const hasProductOrders = loaderData.order.productOrders.length > 0

	const createProductOrderFetcherSubmitting = useFetchers()
		.filter(fetcher => fetcher.key.includes(addProductOrderActionIntent))
		.some(fetcher => fetcher.state !== 'idle')

	const revalidator = useRevalidator()
	useEffect(() => {
		if (!createProductOrderFetcherSubmitting) {
			revalidator.revalidate()
		}
	}, [createProductOrderFetcherSubmitting])

	const ref = useHotkeys<HTMLDivElement>(
		Key.Enter,
		() => productReaderRef.current?.focus(),
		{ preventDefault: true },
	)
	useHotkeys(Key.F1, () => productReaderRef.current?.focus(), {
		preventDefault: true,
	})

	return (
		<CurrentPendingOrderProvider data={loaderData}>
			<ContentLayout title='' limitHeight hasNavbar={false} >
				<div ref={ref} className="flex h-full flex-1  gap-12 ">
					<div className="flex-1 ">
						<ProductReader
							ref={productReaderRef}
							autoFocus
							autoSubmit
							status={'idle'}
						/>
						<Spacer size="4xs" />
						{hasProductOrders ? (
							<CurrentOrderProducts />
						) : (
							<CurrentOrderPlaceholder />
						)}
					</div>
					<CurrentOrderSettingsPanel />
				</div>
			</ContentLayout>
		</CurrentPendingOrderProvider>
	)
}

export const meta: MetaFunction = () => {
	return [{ title: 'Transacción en curso | Ventesca' }]
}
