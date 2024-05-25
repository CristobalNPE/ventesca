// import { conform, useForm } from '@conform-to/react'
// import { getFieldsetConstraint, parse } from '@conform-to/zod'
// import { type Category } from '@prisma/client'
// import {
// 	json,
// 	redirect,
// 	type ActionFunctionArgs,
// 	type SerializeFrom,
// } from '@remix-run/node'
// import { Form, useActionData } from '@remix-run/react'
// import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
// import { z } from 'zod'
// import { ErrorList, Field } from '#app/components/forms.tsx'
// import { Button } from '#app/components/ui/button.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
// import { StatusButton } from '#app/components/ui/status-button.tsx'
// import { validateCSRF } from '#app/utils/csrf.server.ts'
// import { prisma } from '#app/utils/db.server.ts'
// import { useIsPending } from '#app/utils/misc.tsx'

// const nameMinLength = 3
// const nameMaxLength = 100

// const CategoryEditorSchema = z.object({
// 	id: z.string().optional(),
// 	code: z
// 		.number({
// 			required_error: 'Campo obligatorio',
// 			invalid_type_error: 'Código debe ser un número',
// 		})
// 		.min(1, { message: 'El código debe ser mayor a 0.' }),
// 	description: z
// 		.string({ required_error: 'Campo obligatorio' })
// 		.min(nameMinLength, {
// 			message: `Debe tener al menos ${nameMinLength} caracteres`,
// 		})
// 		.max(nameMaxLength, {
// 			message: `Debe tener un máximo de ${nameMaxLength} caracteres`,
// 		}),
// })

// export async function action({ request }: ActionFunctionArgs) {
// 	// const userId = await requireUserId(request)

// 	const formData = await request.formData()
// 	await validateCSRF(formData, request.headers)

// 	const submission = await parse(formData, {
// 		schema: CategoryEditorSchema.superRefine(async (data, ctx) => {
// 			const categoryByCode = await prisma.category.findUnique({
// 				select: { id: true, code: true },
// 				where: { code: data.code },
// 			})
// 			const categoryByDescription = await prisma.category.findFirst({
// 				select: { id: true, description: true },
// 				where: { description: data.description },
// 			})

// 			if (categoryByCode && categoryByCode.id !== data.id) {
// 				ctx.addIssue({
// 					path: ['code'],
// 					code: z.ZodIssueCode.custom,
// 					message: 'El código ya existe.',
// 				})
// 			}
// 			if (categoryByDescription && categoryByDescription.id !== data.id) {
// 				ctx.addIssue({
// 					path: ['description'],
// 					code: z.ZodIssueCode.custom,
// 					message: 'Ya existe una categoría con esta descripción.',
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

// 	const { id: categoryId, code, description } = submission.value

// 	const updatedCategory = await prisma.category.upsert({
// 		select: { id: true },
// 		where: { id: categoryId ?? '__new_category__' },
// 		create: {
// 			code,
// 			description,
// 		},
// 		update: {
// 			code,
// 			description,
// 		},
// 	})

// 	return redirect(`/categories/${updatedCategory.id}`)
// }

// export function CategoryEditor({
// 	category,
// }: {
// 	category?: SerializeFrom<Pick<Category, 'id' | 'code' | 'description'>>
// }) {
// 	const actionData = useActionData<typeof action>()
// 	const isPending = useIsPending()

// 	const [form, fields] = useForm({
// 		id: 'category-editor',
// 		constraint: getFieldsetConstraint(CategoryEditorSchema),
// 		lastSubmission: actionData?.submission,
// 		onValidate({ formData }) {
// 			return parse(formData, { schema: CategoryEditorSchema })
// 		},

// 		defaultValue: {
// 			code: category?.code ?? '',
// 			description: category?.description ?? '',
// 		},
// 	})

// 	return (
// 		<>
// 			<div className="flex flex-col gap-4 p-6">
// 				<div className="mt-2 w-full">
// 					<Form
// 						method="POST"
// 						className="flex  flex-col gap-y-3"
// 						{...form.props}
// 					>
// 						<AuthenticityTokenInput />
// 						{category ? (
// 							<input type="hidden" name="id" value={category.id} />
// 						) : null}

// 						<div className="flex flex-col gap-1">
// 							<Field
// 								labelProps={{ children: 'Código' }}
// 								inputProps={{
// 									autoFocus: true,
// 									...conform.input(fields.code, { ariaAttributes: true }),
// 								}}
// 								errors={fields.code.errors}
// 							/>
// 							<Field
// 								labelProps={{ children: 'Nombre / Descripción' }}
// 								inputProps={{
// 									...conform.input(fields.description, {
// 										ariaAttributes: true,
// 									}),
// 								}}
// 								errors={fields.description.errors}
// 							/>
// 						</div>
// 						<div className="flex gap-4"></div>
// 						<ErrorList id={form.errorId} errors={form.errors} />
// 					</Form>
// 					<div className=" flex justify-between">
// 						<Button form={form.id} variant="ghost" type="reset">
// 							Restaurar
// 						</Button>
// 						<StatusButton
// 							form={form.id}
// 							type="submit"
// 							disabled={isPending}
// 							status={isPending ? 'pending' : 'idle'}
// 						>
// 							<Icon name="check" className="mr-2" />{' '}
// 							{category ? 'Actualizar' : 'Crear Categoría'}
// 						</StatusButton>
// 					</div>
// 				</div>
// 			</div>
// 		</>
// 	)
// }
