import { getFormProps, useForm } from '@conform-to/react'

import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { useFetcher } from '@remix-run/react'
import { z } from 'zod'
import { type deleteProductOrderActionType } from '#app/routes/pos+/product-order-actions.tsx'
import { cn } from '#app/utils/misc.tsx'
import { useCallback } from 'react'

export const deleteProductOrderActionIntent = 'delete-product-order'
export const DeleteFormSchema = z.object({
	intent: z.literal(deleteProductOrderActionIntent),
	productOrderId: z.string(),
})

export function DeleteProductOrder({
	id,
	className,
}: {
	id: string
	className?: string
}) {
	const fetcher = useFetcher<deleteProductOrderActionType>({
		key: `${deleteProductOrderActionIntent}-${id}`,
	})
	const actionData = fetcher.data //this is bad

	const [form] = useForm({
		id: `${deleteProductOrderActionIntent}-${id}`,
		lastResult: actionData?.result,
	})

	return (
		<fetcher.Form
			method="POST"
			action="/pos/product-order-actions"
			{...getFormProps(form)}
		>
			<input type="hidden" name="productOrderId" value={id} />

			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="submit"
							name="intent"
							value={deleteProductOrderActionIntent}
							tabIndex={-1}
							variant={'ghost'}
							size={'sm'}
							className={cn('p-[4px] text-lg ', className)}
						>
							<Icon name="trash" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Quitar producto</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</fetcher.Form>
	)
}

export function useDeleteProductOrder(productOrderId: string) {
	const fetcher = useFetcher({
		key: `${deleteProductOrderActionIntent}-${productOrderId}`,
	})

	return useCallback(() => {
		fetcher.submit(
			{
				intent: deleteProductOrderActionIntent,
				productOrderId: productOrderId,
			},
			{
				method: 'POST',
				action: '/pos/product-order-actions',
			},
		)
	}, [fetcher, productOrderId])
}
