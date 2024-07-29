import { useInputControl } from '@conform-to/react'
import { useFetcher } from '@remix-run/react'
import { action } from '../inventory.edit'

import { useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'

import { Icon } from '#app/components/ui/icon.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { cn } from '#app/utils/misc.tsx'
import { Category } from '@prisma/client'
import { useEffect } from 'react'
import { useSpinDelay } from 'spin-delay'
import { z } from 'zod'
import { useProductContext } from '../context/ProductContext'

export const updateProductCategoryActionIntent = 'update-product-category'

export const CategoryEditorSchema = z.object({
	intent: z.literal(updateProductCategoryActionIntent),
	productId: z.string(),
	categoryId: z.string(),
})

export function ModifyCategorySelect({
	categories,
}: {
	categories: Pick<Category, 'id' | 'description'>[]
}) {
	const { product, isAdmin } = useProductContext()

	const fetcher = useFetcher<typeof action>({
		key: `${updateProductCategoryActionIntent}-product${product.id}`,
	})
	const isPending = fetcher.state !== 'idle'
	const showUpdateSpinner = useSpinDelay(isPending, {
		delay: 150,
		minDuration: 500,
	})

	const [form, fields] = useForm({
		id: updateProductCategoryActionIntent,
		constraint: getZodConstraint(CategoryEditorSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CategoryEditorSchema })
		},

		defaultValue: {
			categoryId: product.categoryId,
		},
	})

	const categoryId = useInputControl(fields.categoryId)

	useEffect(() => {
		if (categoryId.value && categoryId.value !== product.categoryId) {
			fetcher.submit(
				{
					intent: updateProductCategoryActionIntent,
					productId: product.id,
					categoryId: categoryId.value,
				},
				{ method: 'POST', action: '/inventory/edit' },
			)
		}
	}, [categoryId.value])

	return (
		<div className="flex w-full flex-col gap-2">
			<div className="flex w-full  gap-2">
				<Icon
					name={showUpdateSpinner ? 'update' : 'shapes'}
					className={cn('', showUpdateSpinner && 'animate-spin')}
					size="md"
				/>
				<div className="text-muted-foreground">Categoría</div>
			</div>

			<Select
				name={fields.categoryId.name}
				value={categoryId.value}
				onValueChange={categoryId.change}
				disabled={!isAdmin || isPending}
				defaultValue={fields.categoryId.initialValue}
			>
				<SelectTrigger className="">
					<SelectValue placeholder="" />
				</SelectTrigger>
				<SelectContent>
					{categories.map(category => (
						<SelectItem key={category.id} value={category.id}>
							{category.description}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}
