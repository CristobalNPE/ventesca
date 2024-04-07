import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
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
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { CODE_MAX, CODE_MIN } from './__item-editors/code-editor.tsx'
import { NAME_MAX, NAME_MIN } from './__item-editors/name-editor.tsx'

const DEFAULT_SUPPLIER = 'Desconocido'
const DEFAULT_CATEGORY = 'General'
const DEFAULT_CATEGORY_CODE = 999
const DEFAULT_PRICE = 0
const DEFAULT_STOCK = 0

export const CreateItemSchema = z.object({
	itemId: z.string().optional(),
	name: z
		.string({
			required_error: 'Campo obligatorio',
		})
		.min(NAME_MIN, {
			message: 'El nombre debe contener al menos 3 caracteres.',
		})
		.max(NAME_MAX, {
			message: `El nombre no puede ser mayor a ${NAME_MAX} caracteres.`,
		}),
	code: z
		.number({
			required_error: 'Campo obligatorio',
			invalid_type_error: 'Debe ser un número',
		})
		.min(CODE_MIN, { message: 'El código no puede ser negativo.' })
		.max(CODE_MAX, { message: `El código no puede ser mayor a ${CODE_MAX}.` }),
})
export async function loader() {
	throw redirect('/inventory')
}
export async function action({ request }: ActionFunctionArgs) {
	//TODO: SHOULD BE USER WITH PERMISSION
	await requireUserId(request)
	const formData = await request.formData()

	const submission = await parse(formData, {
		schema: CreateItemSchema.superRefine(async (data, ctx) => {
			const itemByCode = await prisma.item.findUnique({
				select: { id: true, code: true },
				where: { code: data.code },
			})

			if (itemByCode && itemByCode.id !== data.itemId) {
				ctx.addIssue({
					path: ['code'],
					code: z.ZodIssueCode.custom,
					message: 'El código ya existe.',
				})
			}
		}),

		async: true,
	})

	if (submission.intent !== 'submit') {
		return json({ submission } as const)
	}

	if (!submission.value) {
		return json({ submission } as const, { status: 400 })
	}

	const { code, name } = submission.value

	let defaultSupplier = await prisma.supplier.findUnique({
		where: { rut: DEFAULT_SUPPLIER },
	})

	if (!defaultSupplier) {
		defaultSupplier = await prisma.supplier.create({
			data: {
				rut: DEFAULT_SUPPLIER,
				name: DEFAULT_SUPPLIER,
				address: DEFAULT_SUPPLIER,
				city: DEFAULT_SUPPLIER,
				fantasyName: DEFAULT_SUPPLIER,
				phone: DEFAULT_SUPPLIER,
				fax: DEFAULT_SUPPLIER,
			},
		})
	}

	let defaultCategory = await prisma.category.findFirst({
		where: { description: DEFAULT_CATEGORY },
	})

	if (!defaultCategory) {
		defaultCategory = await prisma.category.create({
			data: { code: DEFAULT_CATEGORY_CODE, description: DEFAULT_CATEGORY },
		})
	}

	const createdItem = await prisma.item.create({
		data: {
			code,
			isActive: false,
			name,
			sellingPrice: DEFAULT_PRICE,
			price: DEFAULT_PRICE,
			category: { connect: { id: defaultCategory.id } },
			supplier: { connect: { id: defaultSupplier.id } },
			stock: DEFAULT_STOCK,
		},
	})

	return redirect(`/inventory/${createdItem.id}`)
}

export function CreateItemDialog() {
	const createItemFetcher = useFetcher<typeof action>({ key: 'create-item' })
	const actionData = createItemFetcher.data
	const isPending = createItemFetcher.state !== 'idle'

	const [form, fields] = useForm({
		id: 'create-item',
		constraint: getFieldsetConstraint(CreateItemSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: CreateItemSchema })
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
					{...form.props}
				>
					<div className="flex flex-col gap-4 sm:flex-row">
						<Field
							labelProps={{ children: 'Código único' }}
							inputProps={{
								autoFocus: true,
								type: 'number',
								...conform.input(fields.code, { ariaAttributes: true }),
							}}
							errors={fields.code.errors}
						/>
						<Field
							className="grow"
							labelProps={{ children: 'Nombre del producto' }}
							inputProps={{
								...conform.input(fields.name, { ariaAttributes: true }),
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
