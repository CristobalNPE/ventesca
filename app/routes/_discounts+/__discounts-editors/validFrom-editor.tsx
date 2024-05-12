import { Editor } from '#app/components/editor.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Calendar } from '#app/components/ui/calendar.tsx'
import { Icon, IconName } from '#app/components/ui/icon.tsx'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#app/components/ui/popover.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '#app/routes/_discounts+/discounts.edit.tsx'
import { cn } from '#app/utils/misc.tsx'
import { getFormProps, useForm, useInputControl } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { format, setDate } from 'date-fns'
import { useState } from 'react'
import { z } from 'zod'
import { discountAppmethodNames } from '../_constants/discountAppmethodNames.ts'
import { DiscountApplicationMethod } from '../_types/discount-applicationMethod.ts'
import { es } from 'date-fns/locale'

export const UPDATE_DISCOUNT_VALIDFROM_KEY = 'update-discount-validfrom'

export const DiscountValidfromEditorSchema = z.object({
	discountId: z.string(),
	validFrom: z.coerce.date(),
})

export function DiscountValidfromEditModal({
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
		key: UPDATE_DISCOUNT_VALIDFROM_KEY,
	})
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'

	const [open, setOpen] = useState(false)

	const [form, fields] = useForm({
		id: UPDATE_DISCOUNT_VALIDFROM_KEY,
		constraint: getZodConstraint(DiscountValidfromEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: DiscountValidfromEditorSchema })
		},
	})
	// const applicationMethod = useInputControl(fields.applicationMethod)

	// const targetValue = applicationMethod.value
	// 	? discountAppmethodNames[
	// 			applicationMethod.value as DiscountApplicationMethod
	// 	  ]
	// 	: discountAppmethodNames[value as DiscountApplicationMethod]

	const targetValue = 'PLACEHODLER'

	const [date, setDate] = useState<Date>()

	const renderedForm = (
		<fetcher.Form
			method="POST"
			{...getFormProps(form)}
			action={'/discounts/edit'}
		>
			<input type="hidden" name="discountId" value={id} />

			{/* <Select
				defaultValue={value as string}
				name={fields.applicationMethod.name}
				value={applicationMethod.value}
				onValueChange={applicationMethod.change}
			>
				<SelectTrigger>
					<SelectValue className="uppercase" placeholder={label} />
				</SelectTrigger>
				<SelectContent>
					{allDiscountApplicationMethods.map((discountApplicationMethod, i) => (
						<SelectItem
							className="uppercase"
							key={i}
							value={discountApplicationMethod}
						>
							{discountAppmethodNames[discountApplicationMethod]}
						</SelectItem>
					))}
				</SelectContent>
			</Select> */}

			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant={'outline'}
						className={cn(
							'w-full  font-normal',
							!date && 'text-muted-foreground',
						)}
					>
						<Icon name="calendar" className="mr-2 h-4 w-4" />
						{date ? format(date, 'PPP') : <span>Seleccione nueva fecha de inicio</span>}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="center">
					<Calendar
						locale={es}
						mode="single"
						selected={date}
						onSelect={setDate}
						initialFocus
					/>
				</PopoverContent>
			</Popover>

			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)

	const renderedSubmitButton = (
		<StatusButton
			form={form.id}
			type="submit"
			name="intent"
			value={UPDATE_DISCOUNT_VALIDFROM_KEY}
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
			fetcherKey={UPDATE_DISCOUNT_VALIDFROM_KEY}
			targetValue={targetValue}
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
