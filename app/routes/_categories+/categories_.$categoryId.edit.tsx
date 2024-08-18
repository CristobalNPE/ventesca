import { CATEGORY_CODE_MAX } from '#app/components/categories/category-create.tsx'
import { StyledField } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { useCategory } from '#app/context/categories/CategoryContext.tsx'
import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.js'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs } from '@remix-run/node'
import { Form, json, Link, useActionData } from '@remix-run/react'
import { z } from 'zod'

export const editCategoryActionIntent = 'edit-category'
export const CategoryDetailsEditorSchema = z.object({
	categoryId: z.string(),
	code: z
		.number({ required_error: 'El código es requerido' })
		.min(1, { message: 'El código no puede ser negativo.' })
		.max(CATEGORY_CODE_MAX, {
			message: `El código no puede ser mayor a ${CATEGORY_CODE_MAX}.`,
		}),
	colorCode: z.string(),
	name: z.string({ required_error: 'El nombre es requerido' }).min(1, {
		message: 'El nombre no puede ser vacío.',
	}),
	description: z.string({ required_error: 'La descripción es requerida' }),
})

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)
	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: CategoryDetailsEditorSchema.superRefine(async (data, ctx) => {
			const categoryByCode = await prisma.category.findFirst({
				select: { id: true, code: true },
				where: { businessId, code: data.code },
			})

			if (categoryByCode && categoryByCode.id !== data.categoryId) {
				ctx.addIssue({
					path: ['code'],
					code: z.ZodIssueCode.custom,
					message: 'El código ya existe.',
				})
			}
		}),

		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { categoryId, code, colorCode, description, name } = submission.value

	await prisma.category.update({
		where: { id: categoryId },
		data: { code, colorCode, description, name },
	})

	return redirectWithToast(`/categories/${categoryId}`, {
		type: 'success',
		title: 'Categoría actualizada',
		description: 'La categoría ha sido modificada con éxito.',
	})
}

export default function CategoryDetails() {
	const { category } = useCategory()
	const actionData = useActionData<typeof action>()

	const isPending = useIsPending()
	const [form, fields] = useForm({
		id: `category-details-editor-${category.id}`,
		constraint: getZodConstraint(CategoryDetailsEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CategoryDetailsEditorSchema })
		},
		defaultValue: {
			code: category.code,
			colorCode: category.colorCode,
			name: category.name,
			description: category.description,
		},
	})

	return (
		<Card className="flex min-h-[27rem] flex-col">
			<CardHeader className="flex flex-row items-center justify-between ">
				<CardTitle>Detalles de la categoría</CardTitle>
				<div
					tabIndex={-1}
					className="relative flex aspect-square h-7 w-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden  rounded-full border transition-transform hover:scale-125"
				>
					<input
						{...getInputProps(fields.colorCode, {
							ariaAttributes: true,
							type: 'color',
						})}
						className="absolute h-36 w-36  cursor-pointer appearance-none border-none bg-transparent "
					/>
				</div>
			</CardHeader>
			<CardContent className="grid flex-1">
				<Form method="post" {...getFormProps(form)}>
					<input type="hidden" name="categoryId" value={category.id} />
					<StyledField
						variant="slim"
						icon={'hash'}
						labelProps={{
							children: `Código`,
						}}
						inputProps={{
							...getInputProps(fields.code, {
								ariaAttributes: true,
								type: 'text',
							}),

							autoComplete: 'off',
						}}
						errors={fields.code.errors}
					/>
					<StyledField
						variant="slim"
						icon={'id'}
						labelProps={{
							children: `Nombre`,
						}}
						inputProps={{
							...getInputProps(fields.name, {
								ariaAttributes: true,
								type: 'text',
							}),

							autoComplete: 'off',
						}}
						errors={fields.name.errors}
					/>
					<StyledField
						variant="slim"
						icon={'file-text'}
						labelProps={{
							children: `Descripción`,
						}}
						inputProps={{
							...getInputProps(fields.description, {
								ariaAttributes: true,
								type: 'text',
							}),

							autoComplete: 'off',
						}}
						errors={fields.description.errors}
					/>
				</Form>
			</CardContent>
			<CardFooter className="flex  flex-row items-center justify-between gap-4 border-t bg-muted/50 px-6 py-3  ">
				<Button form={form.id} size={'sm'} variant={'outline'} asChild>
					<Link to={`..`} unstable_viewTransition>
						<Icon name="double-arrow-left">Cancelar</Icon>
					</Link>
				</Button>
				<div className="flex gap-4">
					<Button form={form.id} type="reset" variant={'ghost'} size={'sm'}>
						Restaurar
					</Button>
					<StatusButton
						form={form.id}
						className="sm:w-fit"
						type="submit"
						variant="default"
						status={isPending ? 'pending' : (form.status ?? 'idle')}
						disabled={isPending}
					>
						<div className="flex items-center gap-1 ">
							<span>{isPending ? 'Actualizando...' : 'Actualizar Datos'}</span>
						</div>
					</StatusButton>
				</div>
			</CardFooter>
		</Card>
	)
}
