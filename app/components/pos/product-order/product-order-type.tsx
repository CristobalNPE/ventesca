import { useFetcher } from '@remix-run/react'
import { useEffect } from 'react'
import { z } from 'zod'
import { productOrderTypeBgColors } from '#app/constants/productOrderTypesColors.ts'
import {
	ProductOrderType,
	ProductOrderTypeSchema,
} from '#app/types/orders/productOrderType.ts'
import { cn } from '#app/utils/misc.tsx'

export const updateProductOrderTypeActionIntent = 'update-po-type'

export const UpdateProductOrderTypeSchema = z.object({
	intent: z.literal(updateProductOrderTypeActionIntent),
	productOrderId: z.string(),
	productOrderType: ProductOrderTypeSchema,
})

export const ProductOrderTypeToggle = ({
	productOrderId,
	productOrderType,
	setProductOrderType,
	isPromoApplicable,
	className,
}: {
	productOrderId: string
	productOrderType: ProductOrderType
	setProductOrderType: (value: ProductOrderType) => void
	isPromoApplicable: boolean
	className?: string
}) => {
	const productOrderTypeFetcher = useFetcher({
		key: `${updateProductOrderTypeActionIntent}-${productOrderId}`,
	})

	const cycleState = () => {
		let nextState: ProductOrderType

		if (productOrderType === ProductOrderType.SELL) {
			nextState = ProductOrderType.RETURN
		} else if (productOrderType === ProductOrderType.RETURN) {
			nextState = isPromoApplicable
				? ProductOrderType.PROMO
				: ProductOrderType.SELL
		} else {
			nextState = isPromoApplicable
				? ProductOrderType.SELL
				: ProductOrderType.RETURN
		}

		setProductOrderType(nextState)
	}

	//When the promo stops being applicable, it changes back to TYPE_SELL
	useEffect(() => {
		if (productOrderType === ProductOrderType.PROMO && !isPromoApplicable) {
			setProductOrderType(ProductOrderType.SELL)
		}
	}, [isPromoApplicable, productOrderType])

	//Apply update on change
	useEffect(() => {
		productOrderTypeFetcher.submit(
			{
				productOrderType,
				productOrderId,
				intent: updateProductOrderTypeActionIntent,
			},
			{
				method: 'post',
				action: '/pos/product-order-actions',
			},
		)
	}, [productOrderType])

	return (
		<div
			className={cn(
				'flex w-[4rem] cursor-pointer select-none items-center justify-center rounded-sm p-1 text-xs font-bold uppercase tracking-wider text-background',
				className && className,
				productOrderType === ProductOrderType.SELL &&
					productOrderTypeBgColors[ProductOrderType.SELL],
				productOrderType === ProductOrderType.RETURN &&
					productOrderTypeBgColors[ProductOrderType.RETURN],
				productOrderType === ProductOrderType.PROMO &&
					productOrderTypeBgColors[ProductOrderType.PROMO],
			)}
			onClick={cycleState}
			tabIndex={-1}
		>
			{productOrderType.substring(0, 5)}
		</div>
	)
}
