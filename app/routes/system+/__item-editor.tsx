import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { type Item } from '@prisma/client'
import {
	json,
	redirect,
	type ActionFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { useState } from 'react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { SelectModal } from '#app/components/ui/select-modal.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { calculateDV, useIsPending } from '#app/utils/misc.tsx'

type Provider = {
	id: string
	rut: string
	name: string
	fantasyName: string
}

type Category = {
	id: string
	code: string
	description: string
}

const nameMinLength = 3
const nameMaxLength = 100

const ItemEditorSchema = z.object({
	id: z.string().optional(),
	code: z
		.number({ required_error: 'Campo obligatorio' })
		.min(1, { message: 'El código debe ser mayor a 0.' }),
	name: z
		.string({ required_error: 'Campo obligatorio' })
		.min(nameMinLength, {
			message: `Debe tener al menos ${nameMinLength} caracteres`,
		})
		.max(nameMaxLength, {
			message: `Debe tener un máximo de ${nameMaxLength} caracteres`,
		}),
	price: z
		.number({ required_error: 'Campo obligatorio' })
		.min(0, { message: 'El valor no puede ser negativo.' }),
	sellingPrice: z
		.number({ required_error: 'Campo obligatorio' })
		.min(0, { message: 'El valor debe ser mayor a 0.' }),
	stock: z
		.number({ required_error: 'Campo obligatorio' })
		.min(0, { message: 'El stock no puede ser negativo.' }),
	categoryId: z.string(),
	providerId: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
	// const userId = await requireUserId(request)

	const formData = await request.formData()
	await validateCSRF(formData, request.headers)

	const submission = await parse(formData, {
		schema: ItemEditorSchema.superRefine(async (data, ctx) => {
			if (!data.id) return

			const itemByCode = await prisma.item.findUnique({
				select: { id: true, code: true },
				where: { code: data.code },
			})

			if (itemByCode && itemByCode.id !== data.id) {
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

	const {
		id: itemId,
		code,
		name,
		price,
		sellingPrice,
		stock,
		providerId,
		categoryId,
	} = submission.value

	const updatedItem = await prisma.item.upsert({
		select: { id: true },
		where: { id: itemId ?? '__new_item__' },
		create: {
			code,
			name,
			price,
			sellingPrice,
			stock,
			provider: { connect: { id: providerId } }, //
			family: { connect: { id: categoryId } }, //
		},
		update: {
			code,
			name,
			price,
			sellingPrice,
			stock,
			provider: { connect: { id: providerId } },
			family: { connect: { id: categoryId } },
		},
	})

	return redirect(`/system/inventory/${updatedItem.id}`)
}

export function ItemEditor({
	item,
	providers,
	categories,
}: {
	item?: SerializeFrom<
		Pick<
			Item,
			| 'id'
			| 'code'
			| 'name'
			| 'price'
			| 'sellingPrice'
			| 'stock'
			| 'providerId'
			| 'familyId'
		>
	>
	providers: Provider[]
	categories: Category[]
}) {
	const currentProvider =
		providers.find(provider => provider.id === item?.providerId) ?? null

	const currentCategory =
		categories.find(category => category.id === item?.familyId) ?? null

	const [provider, setProvider] = useState<Provider | null>(currentProvider)
	const [category, setCategory] = useState<Category | null>(currentCategory)

	const resetProviderAndCategory = () => {
		setProvider(currentProvider)
		setCategory(currentCategory)
	}

	//Providers Logic
	const [providerModalOpen, setProviderModalOpen] = useState(false)
	const [providerFilter, setProviderFilter] = useState('')
	const handleProviderFilterChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		setProviderFilter(e.target.value)
	}
	const filteredProviders = providers.filter(provider => {
		return (
			provider.name.toLowerCase().includes(providerFilter.toLowerCase()) ||
			provider.rut.includes(providerFilter)
		)
	})

	//Categories Logic
	const [categoryModalOpen, setCategoryModalOpen] = useState(false)
	const [categoryFilter, setCategoryFilter] = useState('')
	const handleCategoryFilterChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		setCategoryFilter(e.target.value)
	}
	const filteredCategories = categories.filter(category => {
		return (
			category.description
				.toLowerCase()
				.includes(categoryFilter.toLowerCase()) ||
			category.code.includes(categoryFilter)
		)
	})

	const providerAndCategorySelected = provider && category

	///////////////////////
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()

	//! here we have to make sure that the CODE is unique so prisma doesn't throw an error
	const [form, fields] = useForm({
		id: 'item-editor',
		constraint: getFieldsetConstraint(ItemEditorSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: ItemEditorSchema })
		},

		defaultValue: {
			code: item?.code ?? '',
			name: item?.name ?? '',
			price: item?.price ?? '',
			sellingPrice: item?.sellingPrice ?? '',
			stock: item?.stock ?? '',
			providerId: provider?.id,
			categoryId: category?.id,
		},
	})

	return (
		<>
			<div className="flex flex-col gap-4 p-6">
				<SelectModal
					open={providerModalOpen}
					onOpenChange={setProviderModalOpen}
					title="Proveedor"
					selected={provider?.name}
				>
					<Input
						autoFocus
						type="text"
						className="mb-4 w-full"
						onChange={handleProviderFilterChange}
						defaultValue={providerFilter}
					/>
					<div className="flex max-h-[15rem] flex-col gap-1 overflow-auto">
						{filteredProviders.map(provider => (
							<div
								key={provider.id}
								className="flex cursor-pointer items-center gap-2 rounded-sm p-1 hover:bg-primary/50"
								onClick={() => {
									setProvider(provider)
									setProviderModalOpen(false)
								}}
							>
								<span className="w-[7rem]">
									{provider.rut}-{calculateDV(provider.rut)}
								</span>{' '}
								<span className="border-l-2 pl-2">{provider.name}</span>
							</div>
						))}
					</div>
				</SelectModal>
				<SelectModal
					open={categoryModalOpen}
					onOpenChange={setCategoryModalOpen}
					title="Categoría"
					selected={category?.description}
				>
					<Input
						autoFocus
						type="text"
						className="mb-4 w-full"
						onChange={handleCategoryFilterChange}
						defaultValue={categoryFilter}
					/>
					<div className="flex max-h-[15rem] flex-col gap-1 overflow-auto">
						{filteredCategories.map(category => (
							<div
								key={category.id}
								className="flex cursor-pointer items-center gap-2 rounded-sm p-1 hover:bg-primary/50"
								onClick={() => {
									setCategory(category)
									setCategoryModalOpen(false)
								}}
							>
								<span className="w-[7rem]">{category.code}</span>{' '}
								<span className="border-l-2 pl-2">{category.description}</span>
							</div>
						))}
					</div>
				</SelectModal>

				{providerAndCategorySelected && (
					<div className="mt-2 w-full">
						<Form
							method="POST"
							className="flex  flex-col gap-y-3"
							{...form.props}
						>
							<AuthenticityTokenInput />
							{item ? <input type="hidden" name="id" value={item.id} /> : null}

							<div className="flex flex-col gap-1">
								<Field
									labelProps={{ children: 'Código' }}
									inputProps={{
										autoFocus: true,
										...conform.input(fields.code, { ariaAttributes: true }),
									}}
									errors={fields.code.errors}
								/>
								<Field
									labelProps={{ children: 'Nombre / Descripción' }}
									inputProps={{
										...conform.input(fields.name, { ariaAttributes: true }),
									}}
									errors={fields.name.errors}
								/>
								<Field
									labelProps={{ children: 'Valor' }}
									inputProps={{
										...conform.input(fields.price, { ariaAttributes: true }),
									}}
									errors={fields.price.errors}
								/>
								<Field
									labelProps={{ children: 'Precio de Venta' }}
									inputProps={{
										...conform.input(fields.sellingPrice, {
											ariaAttributes: true,
										}),
									}}
									errors={fields.sellingPrice.errors}
								/>
								<Field
									labelProps={{ children: 'Stock' }}
									inputProps={{
										...conform.input(fields.stock, { ariaAttributes: true }),
									}}
									errors={fields.stock.errors}
								/>
								<input
									value={provider.id}
									{...conform.input(fields.providerId, { type: 'hidden' })}
								/>
								<input
									value={category.id}
									{...conform.input(fields.categoryId, { type: 'hidden' })}
								/>
							</div>
							<div className="flex gap-4"></div>
							<ErrorList id={form.errorId} errors={form.errors} />
						</Form>
						<div className=" flex justify-between">
							<Button
								form={form.id}
								variant="ghost"
								type="reset"
								onClick={() => resetProviderAndCategory()}
							>
								Restaurar
							</Button>
							<StatusButton
								form={form.id}
								type="submit"
								disabled={isPending || provider.id === '' || category.id === ''}
								status={isPending ? 'pending' : 'idle'}
							>
								<Icon name="check" className="mr-2" />{' '}
								{item ? 'Actualizar' : 'Crear Articulo'}
							</StatusButton>
						</div>
					</div>
				)}
			</div>
		</>
	)
}
