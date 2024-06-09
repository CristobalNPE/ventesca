import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { useIsPending } from '#app/utils/misc.tsx'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type Supplier } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { z } from 'zod'

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { type action } from './__supplier-editor.server.tsx'

import { ErrorList, Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'

export const SupplierInfoEditSchema = z.object({
	id: z.string().optional(),
	rut: z.string({ required_error: 'Campo obligatorio' }),
	name: z.string({ required_error: 'Campo obligatorio' }),
	address: z.string({ required_error: 'Campo obligatorio' }),
	city: z.string({ required_error: 'Campo obligatorio' }),
	fantasyName: z.string({ required_error: 'Campo obligatorio' }),
	phone: z.string({ required_error: 'Campo obligatorio' }),
	email: z.string({ required_error: 'Campo obligatorio' }).email(),
})

export function SupplierEditor({
	supplier,
}: {
	supplier?: SerializeFrom<
		Pick<
			Supplier,
			| 'id'
			| 'rut'
			| 'name'
			| 'address'
			| 'city'
			| 'fantasyName'
			| 'phone'
			| 'email'
		>
	>
}) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'provider-editor',
		constraint: getZodConstraint(SupplierInfoEditSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SupplierInfoEditSchema })
		},
		defaultValue: {
			rut: supplier?.rut ?? '',
			name: supplier?.name ?? '',
			address: supplier?.address ?? '',
			city: supplier?.city ?? '',
			fantasyName: supplier?.fantasyName ?? '',
			phone: supplier?.phone ?? '',
			email: supplier?.email ?? '',
		},
	})

	return (
		<Card className="flex h-[85dvh] animate-slide-left flex-col overflow-hidden ">
			<CardHeader className="flex flex-row items-start justify-between bg-muted/50">
				<div className="grid gap-0.5">
					<CardTitle className="group flex items-center gap-2 text-lg">
						{supplier ? 'Editar Proveedor' : 'Registro de nuevo proveedor'}
					</CardTitle>
					<CardDescription>
						{supplier
							? 'Modificar los datos del registro de proveedor.'
							: 'Complete los datos para registrar el nuevo proveedor en sistema.'}
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="flex-1">
				<Form
					className="flex flex-1 flex-col gap-4 p-6 text-sm "
					method="POST"
					{...getFormProps(form)}
				>
					{supplier ? (
						<input type="hidden" name="id" value={supplier.id} />
					) : null}

					<div className="col-span-1 grid grid-cols-2">
						<Field
							labelProps={{ children: 'RUT' }}
							inputProps={{
								...getInputProps(fields.rut, {
									ariaAttributes: true,
									type: 'text',
								}),
								autoFocus: true,
							}}
							errors={fields.rut.errors}
						/>
					</div>

					<div className="grid gap-8   lg:grid-cols-2 ">
						<Field
							labelProps={{ children: 'Nombre Representante' }}
							inputProps={{
								...getInputProps(fields.name, {
									ariaAttributes: true,
									type: 'text',
								}),
							}}
							errors={fields.name.errors}
						/>
						<Field
							labelProps={{ children: 'Nombre de Empresa' }}
							inputProps={{
								...getInputProps(fields.fantasyName, {
									ariaAttributes: true,
									type: 'text',
								}),
							}}
							errors={fields.fantasyName.errors}
						/>
					</div>

					<div className="grid gap-8 lg:grid-cols-2 ">
						<Field
							labelProps={{ children: 'Ciudad' }}
							inputProps={{
								...getInputProps(fields.city, {
									ariaAttributes: true,
									type: 'text',
								}),
							}}
							errors={fields.city.errors}
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
					</div>

					<div className="grid gap-8 lg:grid-cols-2 ">
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
									type: 'text',
								}),
							}}
							errors={fields.email.errors}
						/>
					</div>

					<ErrorList id={form.errorId} errors={form.errors} />
				</Form>
			</CardContent>
			<CardFooter className="flex flex-row items-center justify-end gap-4 border-t bg-muted/50 px-6 py-3">
				{/* <div className=" flex justify-between"> */}
				<Button form={form.id} variant="ghost" type="reset">
					Restaurar
				</Button>
				<StatusButton
					form={form.id}
					type="submit"
					disabled={isPending}
					status={isPending ? 'pending' : 'idle'}
					iconName="check"
				>
					{supplier ? 'Actualizar registro' : 'Registrar Proveedor'}
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
					<p>Proveedor con ID "{params.providerId}" no existe.</p>
				),
			}}
		/>
	)
}
