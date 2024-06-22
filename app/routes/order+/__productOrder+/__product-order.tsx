import {
	type ProductOrder as ProductOrderModel,
	type Discount,
} from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { useFetchers } from '@remix-run/react'
import React, { forwardRef, useEffect, useState } from 'react'
import { useSpinDelay } from 'spin-delay'
import { Icon } from '#app/components/ui/icon.tsx'

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
import { Separator } from '#app/components/ui/separator.tsx'
import { productOrderTypeBorderColors } from '../_constants/productOrderTypesColors.ts'

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
			// LG SIZE MODIFIERS ARE FOR DESKTOP
			<div
				tabIndex={0}
				ref={rowRef}
				className={cn(
					'relative  flex flex-col gap-4 rounded border bg-accent px-6 pb-6  pt-12 shadow-sm outline-none transition-all  lg:flex-row lg:items-center lg:gap-8 lg:pb-4 lg:pt-8',
					productOrderType === ProductOrderType.SELL &&
						productOrderTypeBorderColors[ProductOrderType.SELL],
					productOrderType === ProductOrderType.RETURN &&
						productOrderTypeBorderColors[ProductOrderType.RETURN],
					productOrderType === ProductOrderType.PROMO &&
						productOrderTypeBorderColors[ProductOrderType.PROMO],
				)}
			>
				<ProductOrderTypeToggle
					className="absolute left-0 top-0 p-2 lg:p-1  "
					productOrderId={productOrder.id}
					isPromoApplicable={isAnyProductDiscountApplicable}
					productOrderType={productOrderType}
					setProductOrderType={setProductOrderType}
				/>
				<div className="absolute right-0 top-0 ">
					{showUpdateSpinner ? (
						<div className="p-[5px] ">
							<Icon name="update" className="animate-spin" />
						</div>
					) : (
						<DeleteProductOrder id={productOrder.id} />
					)}
				</div>

				<div className="flex flex-col gap-1 lg:flex-1 lead">
					<div className="flex justify-between gap-2">
						<span className="text-lg  tracking-tight">{product.name}</span>
					</div>
					<div className="flex w-fit items-center gap-1 rounded bg-muted-foreground/20 px-1 font-normal">
						<Icon name="scan-barcode" />
						<span className="text-sm">{product.code}</span>
					</div>
				</div>

				<div className="flex items-center justify-between gap-4  justify-self-start  lg:w-64">
					<div className="flex flex-col">
						<span>{formatCurrency(product.sellingPrice)}</span>
						<span className="font text-xs leading-none tracking-tight text-muted-foreground lg:text-sm">
							Precio unitario
						</span>
					</div>
					<ProductOrderQuantitySelector
						min={1}
						max={product.stock}
						quantity={quantity}
						setQuantity={setQuantity}
						productOrderId={productOrder.id}
					/>
				</div>

				<div className="flex flex-1 items-center text-xs lg:text-sm ">
					<div className="">
						{productOrderType === ProductOrderType.PROMO ? (
							<div
								className={cn(
									'flex  flex-col-reverse   text-muted-foreground',
									isAnyProductDiscountApplicable && 'text-foreground',
								)}
							>
								<span className=" leading-none text-muted-foreground">
									Descuentos ({applicableProductDiscounts.length})
								</span>
								<span className="text-base">
									{formatCurrency(productOrder.totalDiscount)}
								</span>
							</div>
						) : (
							<div
								className={cn(
									'flex   flex-col   text-muted-foreground',
									isAnyProductDiscountApplicable && 'text-foreground',
								)}
							>
								{applicableProductDiscounts.length !== 0 && (
									<span className=" text-muted-foreground">
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
					</div>
					<div className="ml-auto flex gap-2 text-right text-lg font-bold lg:flex-col lg:gap-0  lg:leading-tight">
						<span className="font-light lg:text-sm">Total:</span>
						<span className="max-w-24">
							{formatCurrency(productOrder.totalPrice)}
						</span>
					</div>
				</div>
			</div>
		)
	},
)
ProductOrder.displayName = 'ProductOrderCard'
