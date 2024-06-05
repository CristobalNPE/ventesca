import { ErrorList, Field } from '#app/components/forms.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { SelectTab } from '#app/components/ui/select-tab.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { action } from '#app/routes/transaction+/index.tsx'
import { formatCurrency } from '#app/utils/misc.tsx'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { discountTypeNames } from '../_discounts+/_constants/discountTypeNames.ts'
import {
	DiscountType,
	DiscountTypeSchema,
	allDiscountTypes,
} from '../_discounts+/_types/discount-type.ts'

export const APPLY_DIRECT_DISCOUNT_KEY = 'apply-direct-discount'

export const DirectDiscountSchema = z.object({
	intent: z.literal(APPLY_DIRECT_DISCOUNT_KEY),
	transactionId: z.string(),
	discountValue: z
		.number({ required_error: 'Campo obligatorio' })
		.min(1, { message: 'Debe indicar un número mayor a 0.' }),
	totalDirectDiscount: z.number(),
	discountType: DiscountTypeSchema,
})

export function DirectDiscount({
	transactionId,
	transactionTotal,
}: {
	transactionId: string
	transactionTotal: number
}) {
	const fetcher = useFetcher<typeof action>({ key: APPLY_DIRECT_DISCOUNT_KEY })

	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'

	const [form, fields] = useForm({
		id: APPLY_DIRECT_DISCOUNT_KEY,
		constraint: getZodConstraint(DirectDiscountSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: DirectDiscountSchema })
		},
		defaultValue: {
			discountValue: 0,
			discountType: DiscountType.FIXED,
		},
	})

	//We close the modal after the submission is successful.
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (fetcher.state === 'idle' && fetcher.data?.result.status === 'success') {
			setOpen(false)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetcher])

	const isDiscountTypeFixed = fields.discountType.value === DiscountType.FIXED

	const totalDirectDiscount = isDiscountTypeFixed
		? Number(fields.discountValue.value)
		: (transactionTotal * Number(fields.discountValue.value)) / 100

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					className="h-8 w-full "
					variant={'outline'}
					disabled={transactionTotal <= 0}
				>
					<Icon className="mr-2" name="tag" /> Descuento Directo
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Ingresar Descuento Directo</DialogTitle>
					<DialogDescription>
						El descuento será aplicado al total de la transacción, adicional a
						otras promociones activas.
					</DialogDescription>
				</DialogHeader>
				<div></div>
				<fetcher.Form
					method="POST"
					action={'/transaction'}
					{...getFormProps(form)}
				>
					<input type="hidden" name="transactionId" value={transactionId} />
					<input
						type="hidden"
						name="totalDirectDiscount"
						value={totalDirectDiscount}
					/>

					<SelectTab
						label="Tipo de descuento"
						options={allDiscountTypes.map(discountType => ({
							label: discountTypeNames[discountType],
							value: discountType,
						}))}
						name={fields.discountType.name}
						initialValue={fields.discountType.initialValue}
					/>
					<Spacer size="4xs" />
					<Field
						className="max-w-full"
						labelProps={{
							children: `Valor del descuento ${
								discountTypeNames[fields.discountType.value as DiscountType]
							}`,
						}}
						inputProps={{
							...getInputProps(fields.discountValue, {
								type: 'number',
								ariaAttributes: true,
							}),
						}}
						errors={fields.discountValue.errors}
					/>

					<ErrorList errors={form.errors} id={form.errorId} />
				</fetcher.Form>

				{/* <div className="text-muted-foreground">
					<div className="flex justify-between">
						<span>Valor previo:</span>
						<span className="w-[10rem]  overflow-x-clip">
							{formatCurrency(transactionTotal)}
						</span>
					</div>
					{isDiscountTypeFixed ? (
						<div className="flex justify-between">
							<span>
								Valor descuento{' '}
								{discountTypeNames[fields.discountType.value as DiscountType]}:
							</span>
							<span className="w-[10rem]  overflow-x-clip">
								{formatCurrency(Number(fields.discountValue.value))}
							</span>
						</div>
					) : (
						<div className="flex justify-between">
							<span>
								Valor descuento{' '}
								{discountTypeNames[fields.discountType.value as DiscountType]}:
							</span>
							<span className="w-[10rem]  overflow-x-clip">
								{Number(fields.discountValue.value)}%
							</span>
						</div>
					)}
					<div className="flex justify-between text-foreground">
						<span>Valor final:</span>{' '}
						<span className="w-[10rem]  overflow-x-clip">
							{formatCurrency(totalDirectDiscount)}
						</span>
					</div>
				</div>
				<Spacer size="4xs" /> */}

				<StatusButton
					form={form.id}
					type="submit"
					name="intent"
					value={APPLY_DIRECT_DISCOUNT_KEY}
					variant="default"
					status={isPending ? 'pending' : form.status ?? 'idle'}
					disabled={isPending}
				>
					<div className="flex items-center gap-1 ">
						<span>{isPending ? 'Aplicando...' : 'Aplicar Descuento'}</span>
					</div>
				</StatusButton>
			</DialogContent>
		</Dialog>
	)
}

export const REMOVE_DIRECT_DISCOUNT_KEY = 'remove-direct-discount'

export const RemoveDirectDiscountSchema = z.object({
	intent: z.literal(REMOVE_DIRECT_DISCOUNT_KEY),
	transactionId: z.string(),
})

export function RemoveDirectDiscount({
	transactionId,
	directDiscount,
}: {
	transactionId: string
	directDiscount: number
}) {
	const fetcher = useFetcher<typeof action>({ key: REMOVE_DIRECT_DISCOUNT_KEY })

	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'

	const [form] = useForm({
		id: REMOVE_DIRECT_DISCOUNT_KEY,
		constraint: getZodConstraint(RemoveDirectDiscountSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: RemoveDirectDiscountSchema })
		},
	})

	return (
		<fetcher.Form method="POST" action={'/transaction'} {...getFormProps(form)}>
			<input type="hidden" name="transactionId" value={transactionId} />
			<StatusButton
				className="h-8 w-full "
				form={form.id}
				type="submit"
				name="intent"
				iconName="cross-1"
				value={REMOVE_DIRECT_DISCOUNT_KEY}
				variant="outline"
				status={isPending ? 'pending' : form.status ?? 'idle'}
				disabled={isPending}
			>
				{isPending
					? 'Aplicando...'
					: `Quitar Descuento ( ${formatCurrency(directDiscount)} )`}
			</StatusButton>
		</fetcher.Form>
	)
}
