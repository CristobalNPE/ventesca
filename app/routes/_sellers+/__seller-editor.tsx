import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { User, type Supplier } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'

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
import { type action } from './__seller-editor.server.tsx'

export const createSellerActionIntent = 'create-seller'
export const SellerInfoEditSchema = z.object({
	id: z.string().optional(),
	name: z.string({ required_error: 'Campo obligatorio' }),
	username: z.string({ required_error: 'Campo obligatorio' }),
	email: z.string({ required_error: 'Campo obligatorio' }).email(),
})

export function SellerEditor({
	seller,
}: {
	seller?: SerializeFrom<Pick<User, 'id' | 'email' | 'name' | 'username'>>
}) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: 'seller-editor',
		constraint: getZodConstraint(SellerInfoEditSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SellerInfoEditSchema })
		},
		defaultValue: {
			name: seller?.name ?? '',
			username: seller?.username ?? '',
			email: seller?.email ?? '',
		},
	})

	return (
		<Card className="flex h-[85dvh] animate-slide-left flex-col overflow-hidden ">
			<CardHeader className="flex flex-row items-start justify-between bg-muted/50">
				<div className="grid gap-0.5">
					<CardTitle className="group flex items-center gap-2 text-lg">
						{seller ? 'Editar datos Vendedor' : 'Registro de nuevo Vendedor'}
					</CardTitle>
					<CardDescription>
						{seller
							? `${seller.name} recibirá un correo electrónico notificando los cambios a su cuenta.`
							: 'El nuevo vendedor recibirá un correo electrónico con sus credenciales de acceso.'}
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="flex-1">
				<Form
					className="flex flex-1 flex-col gap-4 p-6 text-sm "
					method="POST"
					{...getFormProps(form)}
				>
					{seller ? <input type="hidden" name="id" value={seller.id} /> : null}
					<input type="hidden" name="intent" value={createSellerActionIntent} />
					<div className="col-span-1 grid grid-cols-2">
						<Field
							labelProps={{ children: 'Nombre Completo' }}
							inputProps={{
								...getInputProps(fields.name, {
									ariaAttributes: true,
									type: 'text',
								}),
								autoFocus: true,
							}}
							errors={fields.name.errors}
						/>
					</div>

					<div className="grid gap-8   lg:grid-cols-2 ">
						<Field
							labelProps={{ children: 'Nombre usuario' }}
							inputProps={{
								...getInputProps(fields.username, {
									ariaAttributes: true,
									type: 'text',
								}),
							}}
							errors={fields.username.errors}
						/>
					</div>

					<div className="grid gap-8 lg:grid-cols-2 ">
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
					{seller ? 'Actualizar registro' : 'Registrar Vendedor'}
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
					<p>Vendedor con ID "{params.sellerId}" no existe.</p>
				),
			}}
		/>
	)
}
