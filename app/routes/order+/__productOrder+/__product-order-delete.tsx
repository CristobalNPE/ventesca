import { getFormProps, useForm } from '@conform-to/react'

import { useFetcher } from '@remix-run/react'
import { z } from 'zod'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { type deleteProductOrderActionType } from '../product-order.tsx'

export const deleteProductOrderActionIntent = 'delete-product-order'
export const DeleteFormSchema = z.object({
	intent: z.literal(deleteProductOrderActionIntent),
	productOrderId: z.string(),
})

export function DeleteProductOrder({ id }: { id: string }) {
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
			action="/order/product-order"
			{...getFormProps(form)}
		>
			<input type="hidden" name="productOrderId" value={id} />

			<Button
				type="submit"
				name="intent"
				value={deleteProductOrderActionIntent}
				tabIndex={-1}
				variant={'ghost'}
			>
				<Icon name="cross-1" />
			</Button>
		</fetcher.Form>
	)
}
