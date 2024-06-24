import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import {
	getFormProps,
	getInputProps,
	useForm,
	useInputControl,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Order } from '@prisma/client'
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
import { action } from './__order-editor.server.tsx'

export const OrderReportEditSchema = z.object({
	id: z.string().optional(),
	status: OrderStatusSchema,
	paymentMethod: PaymentMethodSchema,
	directDiscount: z.number(),
})

export function OrderEditor({
	order,
}: {
	order: SerializeFrom<
		Pick<Order, 'id' | 'status' | 'paymentMethod' | 'directDiscount'>
	>
}) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'order-editor',
		constraint: getZodConstraint(OrderReportEditSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: OrderReportEditSchema })
		},
		defaultValue: {
			status: order?.status ?? '',
			paymentMethod: order?.paymentMethod ?? '',
			directDiscount: order?.directDiscount ?? '',
		},
	})

	const status = useInputControl(fields.status)
	const paymentMethod = useInputControl(fields.paymentMethod)

	return (
		<Card className="flex h-[85dvh] animate-slide-left flex-col overflow-hidden ">
			<CardHeader className="flex flex-row items-start justify-between bg-muted/50">
				<div className="grid gap-0.5">
					<CardTitle className="group flex items-center gap-2 text-lg">
						Modificar transacción
					</CardTitle>
					<CardDescription>
						Modificar los datos de la transacción.
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="flex-1">
				<Form
					className="flex flex-1 flex-col gap-4 p-6 text-sm "
					method="POST"
					{...getFormProps(form)}
				>
					<input type="hidden" name="id" value={order.id} />

					<Select
						name={fields.status.name}
						value={status.value}
						onValueChange={status.change}
					>
						<SelectTrigger>
							<SelectValue placeholder="Estado de la transacción" />
						</SelectTrigger>
						<SelectContent>
							{allOrderStatuses
								.filter(status => status !== OrderStatus.PENDING)
								.map((status, index) => (
									<SelectItem key={index} value={status}>
										{status}
									</SelectItem>
								))}
						</SelectContent>
					</Select>
					<Select
						name={fields.paymentMethod.name}
						value={paymentMethod.value}
						onValueChange={paymentMethod.change}
					>
						<SelectTrigger>
							<SelectValue placeholder="Método de pago" />
						</SelectTrigger>
						<SelectContent>
							{allPaymentMethods.map((paymentMethod, index) => (
								<SelectItem key={index} value={paymentMethod}>
									{paymentMethod}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Field
						labelProps={{ children: 'Descuento directo' }}
						inputProps={{
							...getInputProps(fields.directDiscount, {
								ariaAttributes: true,
								type: 'text',
							}),
						}}
						errors={fields.directDiscount.errors}
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
					{order ? 'Actualizar registro' : 'Registrar Proveedor'}
				</StatusButton>
			</CardFooter>
		</Card>
	)
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>Transacción con ID "{params.reportId}" no existe.</p>
				),
			}}
		/>
	)
}
