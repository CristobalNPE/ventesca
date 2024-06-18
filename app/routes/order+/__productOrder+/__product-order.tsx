import { Icon } from '#app/components/ui/icon.tsx'
import {
	ProductOrder as ProductOrderModel,
	type Discount,
} from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { useFetchers } from '@remix-run/react'
import React, { forwardRef, useEffect, useState } from 'react'
import { useSpinDelay } from 'spin-delay'

import { cn, formatCurrency } from '#app/utils/misc.tsx'
import {
	ProductOrderType,
	ProductOrderTypeSchema,
} from '../_types/productOrderType.ts'
import { DeleteProductOrder } from './__product-order-delete.tsx'
import {
	ProductOrderQuantitySelector,
	updateProductOrderQuantityActionIntent,
} from './__product-order-quantity.tsx'
import {
	ProductOrderTypeToggle,
	updateProductOrderTypeActionIntent,
} from './__product-order-type.tsx'

type CategoryProps = {
	id: string
	name: string
}

export type ProductProps = {
	id: string
	code: number
	name: string
	sellingPrice: number
	stock: number
	discounts: Discount[]
	category: CategoryProps
}

type ProductOrderProps = {
	product: SerializeFrom<ProductProps>
	productOrder: SerializeFrom<
		Pick<
			ProductOrderModel,
			'id' | 'quantity' | 'type' | 'totalPrice' | 'totalDiscount'
		>
	>
	productReaderRef: React.RefObject<HTMLInputElement>
	globalDiscounts: SerializeFrom<
		Pick<
			Discount,
			| 'id'
			| 'name'
			| 'description'
			| 'applicationMethod'
			| 'type'
			| 'minimumQuantity'
			| 'validFrom'
			| 'validUntil'
			| 'value'
			| 'isActive'
		>
	>[]
}

export const ProductOrder = forwardRef<HTMLDivElement, ProductOrderProps>(
	({ product, productOrder, productReaderRef, globalDiscounts }, ref) => {
		const [quantity, setQuantity] = useState(productOrder.quantity)

		const currentProductOrderType = ProductOrderTypeSchema.parse(
			productOrder.type,
		)

		const [productOrderType, setProductOrderType] = useState<ProductOrderType>(
			currentProductOrderType,
		)

		const productDiscounts = [
			...product.discounts.filter(
				discount => quantity >= discount.minimumQuantity,
			),
			...globalDiscounts.filter(
				discount => quantity >= discount.minimumQuantity,
			),
		]

		const applicableProductDiscounts = productDiscounts.filter(
			discount => discount.isActive,
		)

		const isAnyProductDiscountApplicable = applicableProductDiscounts.length > 0

		// Check the status of submissions that modify the item transaction to know when to show the spinner.
		const updateFetchersKeys = [
			`${updateProductOrderTypeActionIntent}-${productOrder.id}`,
			`${updateProductOrderQuantityActionIntent}-${productOrder.id}`,
		]
		const allFetchers = useFetchers()

		const updateFetchers = allFetchers.filter(fetcher =>
			updateFetchersKeys.includes(fetcher.key),
		)
		const isProductOrderUpdating = updateFetchers.some(
			fetcher => fetcher.state !== 'idle',
		)
		const showUpdateSpinner = useSpinDelay(isProductOrderUpdating, {
			delay: 150,
			minDuration: 500,
		})

		const rowRef = ref

		const handleKeyDown = (event: KeyboardEvent) => {
			switch (event.key) {
				case 'ArrowRight':
					event.preventDefault()
					setQuantity(q => (q < product.stock ? q + 1 : q))
					break

				case 'ArrowLeft':
					event.preventDefault()
					setQuantity(q => (q > 1 ? q - 1 : q))
					break
				case 'V':
				case 'v':
					setProductOrderType(ProductOrderType.SELL)
					break
				case 'D':
				case 'd':
					setProductOrderType(ProductOrderType.RETURN)
					break
				case 'P':
				case 'p':
					event.preventDefault()
					setProductOrderType(ProductOrderType.PROMO)
					break
				case 'Enter':
					event.preventDefault()
					productReaderRef.current?.focus()
					break
			}
		}

		useEffect(() => {
			if (rowRef && typeof rowRef === 'object') {
				const row = rowRef.current
				if (row) {
					row.addEventListener('keydown', handleKeyDown)
				}
				return () => {
					if (row) {
						row.removeEventListener('keydown', handleKeyDown)
					}
				}
			}
		}, [rowRef, product.stock])

		return (
			<ProductOrderCard
				className={cn(
					'flex flex-col gap-3 sm:flex-row sm:items-center  sm:gap-8  ',
					isProductOrderUpdating &&
						'pointer-events-none animate-pulse duration-1000',
				)}
				ref={rowRef}
			>
				<div className="min-w-[11rem] flex-1 ">
					<div className="flex w-fit items-center gap-1 rounded-sm bg-muted/70 px-[2px] text-sm  text-muted-foreground">
						<Icon name="scan-barcode" /> <span>{product.code}</span>
					</div>
					<div className="font-bold uppercase">{product.name}</div>
				</div>

				<div className="flex items-center gap-8 ">
					<div className="flex w-[6.5rem] flex-col ">
						<span className="text-xs text-muted-foreground">
							Precio unitario
						</span>
						<span className="font-thin">
							{formatCurrency(product.sellingPrice)}
						</span>
					</div>
					<ProductOrderQuantitySelector
						min={1}
						max={product.stock}
						quantity={quantity}
						setQuantity={setQuantity}
						productOrderId={productOrder.id}
					/>
					{productOrderType === ProductOrderType.PROMO ? (
						<div
							className={cn(
								'flex w-[6.5rem]  flex-col text-right text-xs text-muted-foreground',
								isAnyProductDiscountApplicable && 'text-foreground',
							)}
						>
							<span className="text-xs text-muted-foreground">
								Descuentos ({applicableProductDiscounts.length})
							</span>
							<span className="font-thin">
								{formatCurrency(productOrder.totalDiscount)}
							</span>
						</div>
					) : (
						<div
							className={cn(
								'flex w-[6.5rem]  flex-col text-right text-xs text-muted-foreground',
								isAnyProductDiscountApplicable && 'text-foreground',
							)}
						>
							{applicableProductDiscounts.length !== 0 && (
								<span className="text-xs text-muted-foreground">
									<span className="font-semibold text-foreground">
										{applicableProductDiscounts.length}
									</span>{' '}
									{applicableProductDiscounts.length === 1
										? 'descuento disponible.'
										: 'descuentos disponibles.'}
								</span>
							)}
						</div>
					)}
					<div className="flex w-[6.5rem]  flex-col text-right">
						<span className="text-xs text-muted-foreground">Total</span>
						<span className="font-bold">
							{formatCurrency(productOrder.totalPrice)}
						</span>
					</div>
				</div>
				<ProductOrderTypeToggle
					productOrderId={productOrder.id}
					isPromoApplicable={isAnyProductDiscountApplicable}
					productOrderType={productOrderType}
					setProductOrderType={setProductOrderType}
				/>
				<div>
					{showUpdateSpinner ? (
						<div className="h-10 px-4 py-2">
							<Icon name="update" className="animate-spin" />
						</div>
					) : (
						<DeleteProductOrder id={productOrder.id} />
					)}
				</div>
			</ProductOrderCard>
		)
	},
)
ProductOrder.displayName = 'ItemTransactionRow'

const ProductOrderCard = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		tabIndex={0}
		className={cn(
			'relative rounded-md border bg-secondary p-3 shadow-sm outline-none transition-all duration-300 focus:brightness-90 dark:focus:brightness-150',
			className,
		)}
		{...props}
	/>
))
ProductOrderCard.displayName = 'ProductOrderCard'
