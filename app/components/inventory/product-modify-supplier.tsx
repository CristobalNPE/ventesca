import { useInputControl, useForm } from '@conform-to/react'

import { getZodConstraint, parseWithZod } from '@conform-to/zod'

import { type Supplier } from '@prisma/client'
import { useFetcher } from '@remix-run/react'
import { useEffect } from 'react'
import { useSpinDelay } from 'spin-delay'
import { z } from 'zod'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { cn } from '#app/utils/misc.tsx'
import { useProductContext } from '../../context/inventory/ProductContext'
import { type action } from '../../routes/_inventory+/inventory.edit'
import { useSuccessToast } from '#app/hooks/useSuccessToast.js'

export const updateProductSupplierActionIntent = 'update-product-supplier'

export const SupplierEditorSchema = z.object({
	intent: z.literal(updateProductSupplierActionIntent),
	productId: z.string(),
	supplierId: z.string(),
})

export function ModifySupplierSelect({
	suppliers,
}: {
	suppliers: Pick<Supplier, 'id' | 'fantasyName'>[]
}) {
	const { product, isAdmin } = useProductContext()

	const fetcher = useFetcher<typeof action>({
		key: `${updateProductSupplierActionIntent}-product${product.id}`,
	})
	const isPending = fetcher.state !== 'idle'
	const showUpdateSpinner = useSpinDelay(isPending, {
		delay: 150,
		minDuration: 500,
	})

	const [form, fields] = useForm({
		id: updateProductSupplierActionIntent,
		constraint: getZodConstraint(SupplierEditorSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SupplierEditorSchema })
		},

		defaultValue: {
			supplierId: product.supplierId,
		},
	})

	const supplierId = useInputControl(fields.supplierId)

	useEffect(() => {
		if (supplierId.value && supplierId.value !== product.supplierId) {
			fetcher.submit(
				{
					intent: updateProductSupplierActionIntent,
					productId: product.id,
					supplierId: supplierId.value,
				},
				{ method: 'POST', action: '/inventory/edit' },
			)
		}
	}, [supplierId.value])

	useSuccessToast({ fetcher, message: 'Proveedor actualizado' })

	return (
		<div className="flex w-full flex-col gap-2">
			<div className="flex w-full  gap-2">
				<Icon
					name={showUpdateSpinner ? 'update' : 'user'}
					className={cn('', showUpdateSpinner && 'animate-spin')}
					size="md"
				/>
				<div className="text-muted-foreground">Proveedor</div>
			</div>

			<Select
				name={fields.supplierId.name}
				value={supplierId.value}
				onValueChange={supplierId.change}
				disabled={!isAdmin || isPending}
				defaultValue={fields.supplierId.initialValue}
			>
				<SelectTrigger className="">
					<SelectValue placeholder="" />
				</SelectTrigger>
				<SelectContent>
					{suppliers.map((supplier) => (
						<SelectItem key={supplier.id} value={supplier.id}>
							{supplier.fantasyName}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}
