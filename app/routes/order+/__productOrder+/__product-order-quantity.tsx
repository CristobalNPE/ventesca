import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { useFetcher } from '@remix-run/react'
import { useEffect, useRef } from 'react'
import { z } from 'zod'

export const updateProductOrderQuantityActionIntent = 'update-po-quantity'

export const UpdateProductOrderQuantitySchema = z.object({
	intent: z.literal(updateProductOrderQuantityActionIntent),
	productOrderId: z.string(),
	productOrderQuantity: z.number().min(0),
})

export const ProductOrderQuantitySelector = ({
	min,
	max,
	quantity,
	setQuantity,
	productOrderId,
}: {
	min: number
	max: number
	quantity: number
	setQuantity: (value: number) => void
	productOrderId: string
}) => {
	const componentRef = useRef<HTMLDivElement>(null)

	const productOrderQuantityFetcher = useFetcher({
		key: `${updateProductOrderQuantityActionIntent}-${productOrderId}`,
	})
	const isSubmitting = productOrderQuantityFetcher.state !== 'idle'

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = parseInt(event.target.value, 10)
		if (!isNaN(newValue) && newValue >= min && newValue <= max) {
			setQuantity(newValue)
		}
	}

	//Apply update on change, after a short delay to allow the user to modify the amount
	useEffect(() => {
		productOrderQuantityFetcher.submit(
			{
				intent: updateProductOrderQuantityActionIntent,
				productOrderId,
				productOrderQuantity: quantity,
			},
			{
				method: 'post',
				action: '/order/product-order',
			},
		)
	}, [quantity])

	const increaseValue = () => {
		const newValue = quantity < max ? quantity + 1 : quantity
		setQuantity(newValue)
	}

	const decreaseValue = () => {
		const newValue = quantity > min ? quantity - 1 : quantity
		setQuantity(newValue)
	}

	return (
		<div ref={componentRef} className="flex rounded-sm border">
			<Button
				tabIndex={-1}
				variant={'ghost'}
				className="aspect-square h-[1.6rem] w-[2rem] rounded-sm p-0"
				onClick={decreaseValue}
				disabled={quantity <= min || isSubmitting}
			>
				<Icon size="lg" name="minus" />
			</Button>

			<Input
				className="h-[1.6rem] w-[3rem] border-none p-0 text-center [&::-webkit-inner-spin-button]:appearance-none"
				tabIndex={-1}
				type="number"
				value={quantity}
				onChange={handleInputChange}
				disabled={true}
			/>

			<Button
				tabIndex={-1}
				variant={'ghost'}
				className="aspect-square h-[1.6rem] w-[2rem] rounded-sm p-0"
				onClick={increaseValue}
				disabled={quantity >= max || isSubmitting}
			>
				<Icon size="lg" name="plus" />
			</Button>
		</div>
	)
}
