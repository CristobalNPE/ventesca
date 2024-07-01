import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import {
	getFormProps,
	getInputProps,
	useForm,
	useInputControl,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Business, Order } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { z } from 'zod'

import { ErrorList, Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { useIsPending } from '#app/utils/misc.tsx'

import { Icon } from '#app/components/ui/icon.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import {
	allOrderStatuses,
	OrderStatus,
	OrderStatusSchema,
} from '../order+/_types/order-status.ts'
import {
	allPaymentMethods,
	PaymentMethodSchema,
} from '../order+/_types/payment-method.ts'
import { action } from './__business-editor.server.tsx'

export const BusinessEditSchema = z.object({
	id: z.string(),
	name: z.string(),
	address: z.string().optional(),
	phone: z.string().optional(),
	email: z
		.string()
		.email()
		.optional()
		.transform(value => value?.toLowerCase()),
	thanksMessage: z
		.string()
		.min(3, { message: 'Mensaje muy corto' })
		.max(35, { message: 'Mensaje muy largo' })
		.optional(),
})

export function BusinessEditor({
	business,
}: {
	business: SerializeFrom<
		Pick<
			Business,
			'id' | 'name' | 'address' | 'phone' | 'email' | 'thanksMessage'
		>
	>
}) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'business-editor',
		constraint: getZodConstraint(BusinessEditSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: BusinessEditSchema })
		},
		defaultValue: {
			name: business.name,
			address: business.address ?? '',
			phone: business.phone ?? '',
			email: business.email ?? '',
			thanksMessage: business.thanksMessage ?? 'Gracias por su compra',
		},
	})

	return (
		<Card className="flex h-[85dvh] animate-slide-left flex-col overflow-hidden ">
			<CardHeader className="flex flex-row items-start justify-between bg-muted/50">
				<div className="grid gap-0.5">
					<CardTitle className="group flex items-center gap-2 text-lg">
						Modificar datos
					</CardTitle>
					<CardDescription>Modificar los datos de la empresa.</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="flex-1">
				<Form
					className="flex flex-1 flex-col gap-4 p-6 text-sm "
					method="POST"
					{...getFormProps(form)}
				>
					<input type="hidden" name="id" value={business.id} />

					<Field
						labelProps={{ children: 'Nombre' }}
						inputProps={{
							...getInputProps(fields.name, {
								ariaAttributes: true,
								type: 'text',
							}),
						}}
						errors={fields.name.errors}
					/>
					<Field
						labelProps={{ children: 'Dirección' }}
						inputProps={{
							...getInputProps(fields.address, {
								ariaAttributes: true,
								type: 'text',
							}),
						}}
						errors={fields.address.errors}
					/>
					<Field
						labelProps={{ children: 'Teléfono' }}
						inputProps={{
							...getInputProps(fields.phone, {
								ariaAttributes: true,
								type: 'text',
							}),
						}}
						errors={fields.phone.errors}
					/>
					<Field
						labelProps={{ children: 'Correo electrónico' }}
						inputProps={{
							...getInputProps(fields.email, {
								ariaAttributes: true,
								type: 'email',
							}),
						}}
						errors={fields.email.errors}
					/>
					<Field
						labelProps={{ children: 'Mensaje de agradecimiento' }}
						inputProps={{
							...getInputProps(fields.thanksMessage, {
								ariaAttributes: true,
								type: 'text',
							}),
						}}
						errors={fields.thanksMessage.errors}
					/>

					<ErrorList id={form.errorId} errors={form.errors} />
				</Form>
			</CardContent>
			<CardFooter className="flex flex-col items-center justify-between gap-4 border-t bg-muted/50 px-6 py-3 sm:flex-row">
				<div className="flex w-full justify-between gap-2 sm:justify-normal">
					<Button variant={'ghost'} asChild>
						<LinkWithParams preserveSearch relative="path" to={'..'}>
							<Icon name="arrow-left" className="mr-2" /> Volver
						</LinkWithParams>
					</Button>
					<Button form={form.id} variant="outline" type="reset">
						Restaurar
					</Button>
				</div>
				<StatusButton
					form={form.id}
					type="submit"
					disabled={isPending}
					status={isPending ? 'pending' : 'idle'}
					iconName="check"
					className="w-full sm:w-fit"
				>
					Actualizar datos
				</StatusButton>
			</CardFooter>
		</Card>
	)
}
