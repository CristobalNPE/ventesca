// import { conform, useForm } from '@conform-to/react'
// import { getFieldsetConstraint, parse } from '@conform-to/zod'
// import { type Supplier } from '@prisma/client'
// import {
// 	type ActionFunctionArgs,
// 	json,
// 	redirect,
// 	type SerializeFrom,
// } from '@remix-run/node'
// import { Form, useActionData } from '@remix-run/react'
// import { clean, validate } from '@validatecl/rut'
// import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
// import { z } from 'zod'
// import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
// import { ErrorList, Field } from '#app/components/forms.tsx'
// import { Button } from '#app/components/ui/button.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
// import { StatusButton } from '#app/components/ui/status-button.tsx'
// import { validateCSRF } from '#app/utils/csrf.server.ts'
// import { prisma } from '#app/utils/db.server.ts'
// import { useIsPending } from '#app/utils/misc.tsx'

// const undefinedDataText = 'Sin datos'

// const ProviderEditorSchema = z.object({
// 	id: z.string().optional(),
// 	rut: z.string({ required_error: 'Campo obligatorio' }), 
// 	name: z.string({ required_error: 'Campo obligatorio' }),
// 	address: z.string().optional(),
// 	city: z.string().optional(),
// 	fantasyName: z.string({ required_error: 'Campo obligatorio' }),
// 	phone: z.string().optional(),
// 	fax: z.string().optional(),
// })

// export async function action({ request }: ActionFunctionArgs) {
// 	// const userId = await requireUserId(request)

// 	const formData = await request.formData()
// 	await validateCSRF(formData, request.headers)

// 	const submission = await parse(formData, {
// 		schema: ProviderEditorSchema.superRefine(async (data, ctx) => {
// 			const providerByRut = await prisma.supplier.findUnique({
// 				select: { id: true, rut: true },
// 				where: { rut: data.rut },
// 			})

// 			if (providerByRut && providerByRut.id !== data.id) {
// 				ctx.addIssue({
// 					path: ['rut'],
// 					code: z.ZodIssueCode.custom,
// 					message: 'Ya existe un proveedor con este RUT.',
// 				})
// 			}

// 			if (!validate(data.rut)) {
// 				ctx.addIssue({
// 					path: ['rut'],
// 					code: z.ZodIssueCode.custom,
// 					message: 'RUT inválido.',
// 				})
// 			}
// 		}),

// 		async: true,
// 	})

// 	if (submission.intent !== 'submit') {
// 		return json({ submission } as const)
// 	}

// 	if (!submission.value) {
// 		return json({ submission } as const, { status: 400 })
// 	}

// 	const {
// 		id: providerId,
// 		rut,
// 		name,
// 		address,
// 		city,
// 		fantasyName,
// 		phone,
// 		fax,
// 	} = submission.value

// 	const cleanedRut = clean(rut)

// 	const updatedProvider = await prisma.supplier.upsert({
// 		select: { id: true },
// 		where: { id: providerId ?? '__new_provider__' },
// 		create: {
// 			rut: cleanedRut ?? rut,
// 			name,
// 			address: address ?? undefinedDataText,
// 			city: city ?? undefinedDataText,
// 			fantasyName,
// 			phone: phone ?? undefinedDataText,
// 			fax: fax ?? undefinedDataText,
// 		},
// 		update: {
// 			rut: cleanedRut ?? rut,
// 			name,
// 			address,
// 			city,
// 			fantasyName,
// 			phone,
// 			fax,
// 		},
// 	})

// 	return redirect(`/providers/${updatedProvider.id}`)
// }

// export function ProviderEditor({
// 	provider,
// }: {
// 	provider?: SerializeFrom<
// 		Pick<
// 			Supplier,
// 			| 'id'
// 			| 'rut'
// 			| 'name'
// 			| 'address'
// 			| 'city'
// 			| 'fantasyName'
// 			| 'phone'
// 			| 'fax'
// 		>
// 	>
// }) {
// 	const actionData = useActionData<typeof action>()
// 	const isPending = useIsPending()

// 	const [form, fields] = useForm({
// 		id: 'provider-editor',
// 		constraint: getFieldsetConstraint(ProviderEditorSchema),
// 		lastSubmission: actionData?.submission,
// 		onValidate({ formData }) {
// 			return parse(formData, { schema: ProviderEditorSchema })
// 		},
// 		defaultValue: {
// 			rut: provider?.rut ?? '',
// 			name: provider?.name ?? '',
// 			address: provider?.address ?? '',
// 			city: provider?.city ?? '',
// 			fantasyName: provider?.fantasyName ?? '',
// 			phone: provider?.phone ?? '',
// 			fax: provider?.fax ?? '',
// 		},
// 	})

// 	return (
// 		<div className="flex flex-col gap-4 p-6">
// 			<Form method="POST" className="flex  flex-col gap-y-3" {...form.props}>
// 				<AuthenticityTokenInput />

// 				{provider ? (
// 					<input type="hidden" name="id" value={provider.id} />
// 				) : null}
// 				<div className="flex flex-col gap-1">
// 					<Field
// 						labelProps={{ children: 'RUT' }}
// 						inputProps={{
// 							autoFocus: true,

// 							...conform.input(fields.rut, { ariaAttributes: true }),
// 						}}
// 						errors={fields.rut.errors}
// 					/>
// 					<Field
// 						labelProps={{ children: 'Nombre' }}
// 						inputProps={{
// 							...conform.input(fields.name, { ariaAttributes: true }),
// 						}}
// 						errors={fields.name.errors}
// 					/>
// 					<Field
// 						labelProps={{ children: 'Dirección' }}
// 						inputProps={{
// 							...conform.input(fields.address, { ariaAttributes: true }),
// 						}}
// 						errors={fields.address.errors}
// 					/>
// 					<Field
// 						labelProps={{ children: 'Ciudad' }}
// 						inputProps={{
// 							...conform.input(fields.city, { ariaAttributes: true }),
// 						}}
// 						errors={fields.city.errors}
// 					/>
// 					<Field
// 						labelProps={{ children: 'Nombre de Empresa' }}
// 						inputProps={{
// 							...conform.input(fields.fantasyName, { ariaAttributes: true }),
// 						}}
// 						errors={fields.fantasyName.errors}
// 					/>
// 					<Field
// 						labelProps={{ children: 'Teléfono' }}
// 						inputProps={{
// 							...conform.input(fields.phone, { ariaAttributes: true }),
// 						}}
// 						errors={fields.phone.errors}
// 					/>
// 					<Field
// 						labelProps={{ children: 'Fax' }}
// 						inputProps={{
// 							...conform.input(fields.fax, { ariaAttributes: true }),
// 						}}
// 						errors={fields.fax.errors}
// 					/>
// 				</div>
// 				<ErrorList id={form.errorId} errors={form.errors} />
// 			</Form>
// 			<div className=" flex justify-between">
// 				<Button form={form.id} variant="ghost" type="reset">
// 					Restaurar
// 				</Button>
// 				<StatusButton
// 					form={form.id}
// 					type="submit"
// 					disabled={isPending}
// 					status={isPending ? 'pending' : 'idle'}
// 				>
// 					<Icon name="check" className="mr-2" />{' '}
// 					{provider ? 'Actualizar' : 'Ingresar Proveedor'}
// 				</StatusButton>
// 			</div>
// 		</div>
// 	)
// }

// export function ErrorBoundary() {
// 	return (
// 		<GeneralErrorBoundary
// 			statusHandlers={{
// 				404: ({ params }) => (
// 					<p>Proveedor con ID "{params.providerId}" no existe.</p>
// 				),
// 			}}
// 		/>
// 	)
// }
