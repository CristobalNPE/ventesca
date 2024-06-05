import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { useDebounce } from '#app/utils/misc.tsx'
import { useFetcher } from '@remix-run/react'
import { useEffect, useRef } from 'react'
import { z } from 'zod'

export const UPDATE_IT_QUANTITY = 'update-it-quantity'

export const UpdateItemTransactionQuantitySchema = z.object({
	itemTransactionId: z.string(),
	itemTransactionQuantity: z.number().min(0),
})

export const QuantitySelector = ({
	min,
	max,
	quantity,
	setQuantity,
	itemTransactionId,
}: {
	min: number
	max: number
	quantity: number
	setQuantity: (value: number) => void
	itemTransactionId: string
}) => {
	const componentRef = useRef<HTMLDivElement>(null)

	const itemTransactionQuantityFetcher = useFetcher({
		key: `${UPDATE_IT_QUANTITY}-${itemTransactionId}`,
	})
	const isSubmitting = itemTransactionQuantityFetcher.state !== 'idle'




	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = parseInt(event.target.value, 10)
		if (!isNaN(newValue) && newValue >= min && newValue <= max) {
			setQuantity(newValue)
		}
	}

	//Apply update on change, after a short delay to allow the user to modify the amount
	useEffect(() => {
		itemTransactionQuantityFetcher.submit(
			{
				intent: UPDATE_IT_QUANTITY,
				itemTransactionId: itemTransactionId,
				itemTransactionQuantity: quantity,
			},
			{
				method: 'post',
				action: '/transaction/edit',
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
