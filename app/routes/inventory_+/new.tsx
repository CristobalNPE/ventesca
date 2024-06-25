import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '#app/components/ui/alert-dialog.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getWhereBusinessQuery } from '#app/utils/global-queries.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { CODE_MAX, CODE_MIN } from './__product-editors/code-editor.tsx'
import {
	PRODUCT_NAME_MAX,
	PRODUCT_NAME_MIN,
} from './__product-editors/name-editor.tsx'

const DEFAULT_PRICE = 0
const DEFAULT_STOCK = 0

export const CreateItemSchema = z.object({
	productId: z.string().optional(),
	name: z
		.string({
			required_error: 'Campo obligatorio',
		})
		.min(PRODUCT_NAME_MIN, {
			message: 'El nombre debe contener al menos 3 caracteres.',
		})
		.max(PRODUCT_NAME_MAX, {
			message: `El nombre no puede ser mayor a ${PRODUCT_NAME_MAX} caracteres.`,
		}),
	code: z
		.string({
			required_error: 'Campo obligatorio',
		})
		.min(CODE_MIN, { message: 'El código no puede ser negativo.' })
		.max(CODE_MAX, { message: `El código no puede ser mayor a ${CODE_MAX}.` }),
})
export async function loader() {
	throw redirect('/inventory')
}
export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)
	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: CreateItemSchema.superRefine(async (data, ctx) => {
			const productByCode = await prisma.product.findFirst({
				select: { id: true, code: true },
				where: { businessId, code: data.code },
			})

			if (productByCode && productByCode.id !== data.productId) {
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

	const { code, name } = submission.value

	const defaultCategory = await prisma.category.findFirstOrThrow({
		where: { businessId, isEssential: true },
		select: { id: true },
	})
	const defaultSupplier = await prisma.supplier.findFirstOrThrow({
		where: { businessId, isEssential: true },
		select: { id: true },
	})

	const createdProduct = await prisma.product.create({
		data: {
			code,
			isActive: false,
			name,
			sellingPrice: DEFAULT_PRICE,
			price: DEFAULT_PRICE,
			category: { connect: { id: defaultCategory.id } },
			supplier: { connect: { id: defaultSupplier.id } },
			business: { connect: { id: businessId } },
			stock: DEFAULT_STOCK,
		},
	})

	return redirect(`/inventory/${createdProduct.id}`)
}

export function CreateItemDialog() {
	const createItemFetcher = useFetcher<typeof action>({ key: 'create-item' })
	const actionData = createItemFetcher.data
	const isPending = createItemFetcher.state !== 'idle'

	const [form, fields] = useForm({
		id: 'create-item',
		constraint: getZodConstraint(CreateItemSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CreateItemSchema })
		},
	})

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant={'outline'}>
					<Icon name="plus" size="md" />
					<span>Agregar articulo</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Agregar Articulo</AlertDialogTitle>
					<AlertDialogDescription>
						Complete la información para registrar el nuevo articulo en
						inventario.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<createItemFetcher.Form
					method="POST"
					action="/inventory/new"
					{...getFormProps(form)}
				>
					<div className="flex flex-col gap-4 sm:flex-row">
						<Field
							labelProps={{ children: 'Código único' }}
							inputProps={{
								autoFocus: true,

								...getInputProps(fields.code, {
									type: 'number',
									ariaAttributes: true,
								}),
							}}
							errors={fields.code.errors}
						/>
						<Field
							className="grow"
							labelProps={{ children: 'Nombre del producto' }}
							inputProps={{
								...getInputProps(fields.name, {
									type: 'text',
									ariaAttributes: true,
								}),
							}}
							errors={fields.name.errors}
						/>
					</div>
					<ErrorList id={form.errorId} errors={form.errors} />
				</createItemFetcher.Form>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>

					<StatusButton
						form={form.id}
						type="submit"
						disabled={isPending}
						status={isPending ? 'pending' : 'idle'}
					>
						<Icon name="check" className="mr-2" />
						Registrar Articulo
					</StatusButton>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
