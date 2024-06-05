import { Icon, IconName } from '#app/components/ui/icon.tsx'
import { useFetcher } from '@remix-run/react'
import { z } from 'zod'
import { type action } from '#app/routes/_discounts+/discounts.edit.tsx'
import { useState } from 'react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { Editor } from '#app/components/editor.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { cn } from '#app/utils/misc.tsx'

export const DISCOUNT_DESCRIPTION_MAX = 60
export const DISCOUNT_DESCRIPTION_MIN = 5
export const UPDATE_DISCOUNT_DESCRIPTION_KEY = 'update-discount-description'
export const REGENERATE_DISCOUNT_DESCRIPTION_KEY =
	'regenerate-discount-description'

export const DiscountDescriptionEditorSchema = z.object({
	discountId: z.string(),
	description: z
		.string()
		.min(DISCOUNT_DESCRIPTION_MIN, {
			message: `La descripción debe contener al menos ${DISCOUNT_DESCRIPTION_MIN} caracteres.`,
		})
		.max(DISCOUNT_DESCRIPTION_MAX, {
			message: `La descripción no puede ser mayor a ${DISCOUNT_DESCRIPTION_MAX} caracteres.`,
		})
		.optional(),
})

export function DiscountDescriptionEditModal({
	icon,
	label,
	value,
	id,
}: {
	icon: IconName
	label: string
	value: string | number
	id?: string
}) {
	const fetcher = useFetcher<typeof action>({
		key: UPDATE_DISCOUNT_DESCRIPTION_KEY,
	})
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'

	const [open, setOpen] = useState(false)

	const [form, fields] = useForm({
		id: UPDATE_DISCOUNT_DESCRIPTION_KEY,
		constraint: getZodConstraint(DiscountDescriptionEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: DiscountDescriptionEditorSchema })
		},

		defaultValue: {
			description: value as string,
		},
	})

	const [targetValue, setTargetValue] = useState<string | number>(value)

	const renderedForm = (
		<fetcher.Form
			method="POST"
			{...getFormProps(form)}
			action={'/discounts/edit'}
		>
			<input type="hidden" name="discountId" value={id} />
			<Field
				labelProps={{ children: `Nuevo ${label}`, hidden: true }}
				inputProps={{
					...getInputProps(fields.description, {
						type: 'text',
						ariaAttributes: true,
					}),
					onChange: e => setTargetValue(e.target.value),
					value: targetValue,
					autoComplete: 'off',
				}}
				errors={fields.description.errors}
			/>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)

	const renderedSubmitButton = (
		<StatusButton
			form={form.id}
			type="submit"
			name="intent"
			value={UPDATE_DISCOUNT_DESCRIPTION_KEY}
			variant="default"
			status={isPending ? 'pending' : form.status ?? 'idle'}
			disabled={isPending}
		>
			<div className="flex items-center gap-1 ">
				<span>{isPending ? 'Actualizando...' : 'Confirmar'}</span>
			</div>
		</StatusButton>
	)

	return (
		<div className="flex gap-3">
			<TooltipProvider delayDuration={300}>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="outline"
							size={'icon'}
							className="h-7  w-7 shrink-0"
							onClick={() =>
								fetcher.submit(
									{
										discountId: id!,
										intent: REGENERATE_DISCOUNT_DESCRIPTION_KEY,
									},
									{
										action: '/discounts/edit',
										method: 'POST',
									},
								)
							}
						>
							<Icon className={cn(isPending && 'animate-spin')} name="update" />
							<span className="sr-only">Regenerar Descripción</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>Regenerar Descripción</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<Editor
				fetcherKey={UPDATE_DISCOUNT_DESCRIPTION_KEY}
				targetValue={targetValue}
				open={open}
				setOpen={setOpen}
				icon={icon}
				label={label}
				value={value}
				form={renderedForm}
				submitButton={renderedSubmitButton}
			/>
		</div>
	)
}
