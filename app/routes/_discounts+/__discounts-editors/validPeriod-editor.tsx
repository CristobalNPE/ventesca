import { Editor } from '#app/components/editor.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { DatePickerWithRange } from '#app/components/ui/date-picker.tsx'
import { IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '#app/routes/_discounts+/discounts.edit.tsx'
import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { DateRange } from 'react-day-picker'
import { z } from 'zod'

export const UPDATE_DISCOUNT_VALIDPERIOD_KEY = 'update-discount-validperiod'
const DEFAULT_RANGE = 7

export const DiscountValidperiodEditorSchema = z.object({
	discountId: z.string(),
	validFrom: z.coerce.date(),
	validUntil: z.coerce.date(),
})

export function DiscountValidperiodEditModal({
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
		key: UPDATE_DISCOUNT_VALIDPERIOD_KEY,
	})
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'

	const [open, setOpen] = useState(false)

	const [form, fields] = useForm({
		id: UPDATE_DISCOUNT_VALIDPERIOD_KEY,
		constraint: getZodConstraint(DiscountValidperiodEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: DiscountValidperiodEditorSchema })
		},
	})

	const [discountPeriod, setDiscountPeriod] = useState<DateRange | undefined>({
		from: new Date(),
		to: addDays(new Date(), DEFAULT_RANGE),
	})

	const formattedDates =
		discountPeriod?.from && discountPeriod?.to
			? `${format(discountPeriod.from, "dd 'de' MMMM 'del' yyyy", {
					locale: es,
			  })} -- ${format(discountPeriod.to, "dd 'de' MMMM 'del' yyyy", {
					locale: es,
			  })}`
			: value

	const renderedForm = (
		<fetcher.Form
			method="POST"
			{...getFormProps(form)}
			action={'/discounts/edit'}
		>
			<input type="hidden" name="discountId" value={id} />
			<input
				type="hidden"
				name={fields.validFrom.name}
				value={discountPeriod?.from?.toISOString()}
			/>
			<input
				type="hidden"
				name={fields.validUntil.name}
				value={discountPeriod?.to?.toISOString()}
			/>

			<DatePickerWithRange
				date={discountPeriod}
				setDate={setDiscountPeriod}
				label="Periodo de validez"
			/>
			<div className="min-h-[32px] px-4 pb-3 pt-1">
				{fields.validFrom.errors ? (
					<ErrorList id={form.id} errors={fields.validFrom.errors} />
				) : null}
			</div>

			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)

	const renderedSubmitButton = (
		<StatusButton
			form={form.id}
			type="submit"
			name="intent"
			value={UPDATE_DISCOUNT_VALIDPERIOD_KEY}
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
		<Editor
			fetcherKey={UPDATE_DISCOUNT_VALIDPERIOD_KEY}
			targetValue={formattedDates}
			open={open}
			setOpen={setOpen}
			icon={icon}
			label={label}
			value={value}
			form={renderedForm}
			submitButton={renderedSubmitButton}
		/>
	)
}
