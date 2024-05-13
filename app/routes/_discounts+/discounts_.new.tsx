import { Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { SelectTab } from '#app/components/ui/select-tab.tsx'
import { invariant, useIsPending } from '#app/utils/misc.tsx'
import { ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { Form, Link, useActionData } from '@remix-run/react'
import { useState } from 'react'
import { z } from 'zod'
import { DiscountScope, DiscountScopeSchema } from './_types/discount-reach.ts'
import { DiscountType, DiscountTypeSchema } from './_types/discount-type.ts'

import { Spacer } from '#app/components/spacer.tsx'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '#app/components/ui/breadcrumb.tsx'
import { DatePickerWithRange } from '#app/components/ui/date-picker.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { addDays } from 'date-fns'
import { DateRange } from 'react-day-picker'

import { ItemPicker } from './discounts.item-picker.tsx'
import {
	DiscountApplicationMethod,
	DiscountApplicationMethodSchema,
} from './_types/discount-applicationMethod.ts'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { CategoryPicker } from './discounts.category-picker.tsx'

const DEFAULT_MIN_QUANTITY_REQUIRED = 1
const DEFAULT_FIXED_DISCOUNT_VALUE = 0
const DEFAULT_PERCENTAGE_DISCOUNT_VALUE = 0

const NAME_MIN_LENGTH = 7
const NAME_MAX_LENGTH = 50

const NewDiscountSchema = z.object({
	minQuantity: z
		.number({ required_error: 'Campo obligatorio' })
		.min(1, { message: 'El mínimo aplicable es 1.' }),
	name: z
		.string({ required_error: 'Campo obligatorio' })
		.min(NAME_MIN_LENGTH, {
			message: `Debe tener al menos ${NAME_MIN_LENGTH} caracteres`,
		})
		.max(NAME_MAX_LENGTH, {
			message: `Debe tener un máximo de ${NAME_MAX_LENGTH} caracteres`,
		}),

	fixedValue: z
		.number({ required_error: 'Campo obligatorio' })
		.min(1, { message: 'El mínimo aplicable es 1.' })
		.optional(),

	porcentualValue: z
		.number({ required_error: 'Campo obligatorio' })
		.min(1, { message: 'El mínimo aplicable es 1.' })
		.max(100, { message: 'El máximo aplicable es 100.' })
		.optional(),

	discountType: DiscountTypeSchema,
	discountScope: DiscountScopeSchema,
	discountApplicationMethod: DiscountApplicationMethodSchema,
	validFrom: z.coerce.date(),
	validUntil: z.coerce.date(),
	itemIds: z.string().optional(),
	categoryIds: z.string().optional(),
})

export function buildDescription(
	discountType: DiscountType,
	discountValue: number,
	discountScope: DiscountScope,
	discountApplicationMethod: DiscountApplicationMethod,
	minQuantity: number,
) {
	const descriptionValue =
		discountType === DiscountType.FIXED
			? `$${discountValue}`
			: `${discountValue}%`

	const descriptionScope =
		discountScope === DiscountScope.SINGLE_ITEM
			? 'artículos seleccionados'
			: discountScope === DiscountScope.CATEGORY
			  ? `categorías seleccionadas`
			  : 'todos los artículos'

	const descriptionApplicationMethod =
		discountApplicationMethod === DiscountApplicationMethod.TO_TOTAL
			? `aplicado al total de la compra`
			: `aplicado al valor de cada articulo`

	return `${descriptionValue} de descuento en ${descriptionScope}, ${descriptionApplicationMethod}. Cantidad minima ${minQuantity}.`
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()

	const businessId = await getBusinessId(userId)
	const submission = await parseWithZod(formData, {
		schema: NewDiscountSchema.superRefine(async (data, ctx) => {
			if (
				data.discountScope === DiscountScope.SINGLE_ITEM &&
				data.itemIds === undefined
			) {
				ctx.addIssue({
					path: ['itemIds'],
					code: z.ZodIssueCode.custom,
					message: 'Debe seleccionar uno o mas artículos.',
				})
			}

			if (
				data.discountScope === DiscountScope.CATEGORY &&
				data.categoryIds === undefined
			) {
				ctx.addIssue({
					path: ['categoryIds'],
					code: z.ZodIssueCode.custom,
					message: 'Debe seleccionar una categoría.',
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
	let {
		discountScope,
		discountType,
		minQuantity,
		name,
		validFrom,
		validUntil,
		categoryIds,
		fixedValue,
		itemIds,
		porcentualValue,
		discountApplicationMethod,
	} = submission.value

	const discountValue =
		discountType === DiscountType.FIXED ? fixedValue : porcentualValue

	invariant(
		discountValue,
		'At least one type of discount value should be already defined.',
	)

	const generatedDescription = buildDescription(
		discountType,
		discountValue,
		discountScope,
		discountApplicationMethod,
		minQuantity,
	)

	fixedValue = fixedValue === undefined ? 0 : fixedValue
	porcentualValue = porcentualValue === undefined ? 0 : porcentualValue

	if (discountScope === DiscountScope.SINGLE_ITEM) {
		invariant(itemIds, 'Item IDs should be defined.')
		const itemIdsArray = itemIds.split(',')

		const createdDiscount = await prisma.discount.create({
			data: {
				description: generatedDescription,
				minimumQuantity: minQuantity,
				name: name,
				validFrom: validFrom,
				validUntil: validUntil,
				value:
					discountType === DiscountType.FIXED ? fixedValue : porcentualValue,
				items: { connect: itemIdsArray.map(itemId => ({ id: itemId })) },
				scope: discountScope,
				business: { connect: { id: businessId } },
				type: discountType,
				isActive: true,
				applicationMethod: discountApplicationMethod,
			},
			select: { id: true },
		})
		return redirect(`/discounts/${createdDiscount.id}`)
	}
	if (discountScope === DiscountScope.CATEGORY) {
		invariant(categoryIds, 'Category IDs should be defined.')
		const categoryIdsArray = categoryIds.split(',')

		let itemIdsInSelectedCategories: string[] = []

		for (const categoryId of categoryIdsArray) {
			const itemsInCategory = await prisma.item.findMany({
				where: { categoryId: categoryId },
				select: { id: true },
			})
			let itemIdsInCategory = itemsInCategory.map(item => item.id)
			itemIdsInSelectedCategories = [
				...itemIdsInSelectedCategories,
				...itemIdsInCategory,
			]
		}

		const createdDiscount = await prisma.discount.create({
			data: {
				description: generatedDescription,
				minimumQuantity: minQuantity,
				name: name,
				validFrom: validFrom,
				validUntil: validUntil,
				value:
					discountType === DiscountType.FIXED ? fixedValue : porcentualValue,
				items: {
					connect: itemIdsInSelectedCategories.map(itemId => ({ id: itemId })),
				},
				scope: discountScope,
				business: { connect: { id: businessId } },
				type: discountType,
				isActive: true,
				applicationMethod: discountApplicationMethod,
			},
			select: { id: true },
		})
		return redirect(`/discounts/${createdDiscount.id}`)
	}

	//we fallback to GLOBAL SCOPE behavior (not related to any item in particular):
	const createdDiscount = await prisma.discount.create({
		data: {
			description: generatedDescription,
			minimumQuantity: minQuantity,
			name: name,
			validFrom: validFrom,
			validUntil: validUntil,
			value: discountType === DiscountType.FIXED ? fixedValue : porcentualValue,
			scope: discountScope,
			business: { connect: { id: businessId } },
			type: discountType,
			isActive: true,
			applicationMethod: discountApplicationMethod,
		},
	})

	return redirect(`/discounts/${createdDiscount.id}`)
}

export default function CreateDiscount() {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [form, fields] = useForm({
		id: 'new-discount',
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
		constraint: getZodConstraint(NewDiscountSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: NewDiscountSchema })
		},

		defaultValue: {
			minQuantity: DEFAULT_MIN_QUANTITY_REQUIRED,
			fixedValue: DEFAULT_FIXED_DISCOUNT_VALUE,
			porcentualValue: DEFAULT_PERCENTAGE_DISCOUNT_VALUE,
			discountScope: DiscountScope.GLOBAL,
			discountType: DiscountType.FIXED,
			discountApplicationMethod: DiscountApplicationMethod.BY_ITEM,
		},
	})

	const DEFAULT_RANGE = 7
	const [discountPeriod, setDiscountPeriod] = useState<DateRange | undefined>({
		from: new Date(),
		to: addDays(new Date(), DEFAULT_RANGE),
	})

	const [addedItemsIds, setAddedItemsIds] = useState<string>('')
	const [addedCategoriesIds, setAddedCategoriesIds] = useState<string>('')

	return (
		<>
			<BreadCrumbs />
			<Spacer size="4xs" />
			<main className="flex  flex-col  gap-4 lg:flex-row lg:gap-8">
				<Card className="w-full lg:max-w-xl">
					<CardHeader>
						<CardTitle>Registrar Descuento</CardTitle>
						<CardDescription>
							Complete la información para ingresar el nuevo descuento en
							sistema.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Form method="POST" className="grid " {...getFormProps(form)}>
							<input
								type="hidden"
								name={fields.itemIds.name}
								value={addedItemsIds}
							/>
							<input
								type="hidden"
								name={fields.categoryIds.name}
								value={addedCategoriesIds}
							/>
							<input
								type="hidden"
								name={fields.validFrom.name}
								value={discountPeriod?.from?.toISOString()}
							/>
							<input
								type="hidden"
								name={fields.validUntil.name}
								value={discountPeriod?.to?.toISOString()}
							/>
							<div className="mb-5 space-y-2">
								<SelectTab
									label="Alcance del descuento"
									options={[
										{
											label: 'Global',
											value: DiscountScope.GLOBAL,
											// icon: 'world',
										},
										{
											label: 'Por Categoría',
											value: DiscountScope.CATEGORY,
											// icon: 'shapes',
										},
										{
											label: 'Por Articulo',
											value: DiscountScope.SINGLE_ITEM,
											// icon: 'package',
										},
									]}
									name={fields.discountScope.name}
									initialValue={fields.discountScope.initialValue}
								/>
								<SelectTab
									label="Tipo de descuento"
									options={[
										{
											label: 'Fijo',
											value: DiscountType.FIXED,
											// icon: 'circle-dollar-sign',
										},
										{
											label: 'Porcentaje',
											value: DiscountType.PERCENTAGE,
											// icon: 'percentage',
										},
									]}
									name={fields.discountType.name}
									initialValue={fields.discountType.initialValue}
								/>
								<SelectTab
									label="Método de aplicación"
									options={[
										{
											label: 'Por Articulo',
											value: DiscountApplicationMethod.BY_ITEM,
											// icon: 'circle-dollar-sign',
										},
										{
											label: 'Al Total',
											value: DiscountApplicationMethod.TO_TOTAL,
											// icon: 'percentage',
										},
									]}
									name={fields.discountApplicationMethod.name}
									initialValue={fields.discountApplicationMethod.initialValue}
								/>
							</div>
							<div className="grid sm:grid-cols-2 gap-4">
								{fields.discountType.value === DiscountType.FIXED ? (
									<Field
										labelProps={{ children: 'Valor descuento fijo' }}
										inputProps={{
											...getInputProps(fields.fixedValue, {
												type: 'text',
												ariaAttributes: true,
											}),
										}}
										errors={fields.fixedValue.errors}
									/>
								) : (
									<Field
										labelProps={{ children: 'Valor descuento porcentual' }}
										inputProps={{
											...getInputProps(fields.porcentualValue, {
												type: 'number',
												ariaAttributes: true,
											}),
										}}
										errors={fields.porcentualValue.errors}
									/>
								)}

								<Field
									labelProps={{ children: 'Cantidad minima requerida' }}
									inputProps={{
										...getInputProps(fields.minQuantity, {
											type: 'number',
											ariaAttributes: true,
										}),
									}}
									errors={fields.minQuantity.errors}
								/>
							</div>
							<div className="space-y-2">
								<Field
									labelProps={{ children: 'Nombre' }}
									inputProps={{
										placeholder: 'Ej: Descuento Temporada Invierno',
										...getInputProps(fields.name, {
											type: 'text',
											ariaAttributes: true,
										}),
									}}
									errors={fields.name.errors}
								/>
								<DatePickerWithRange
									date={discountPeriod}
									setDate={setDiscountPeriod}
									label="Periodo de validez"
								/>
							</div>
						</Form>
					</CardContent>
					<CardFooter className="flex justify-end gap-2">
						<Button variant="outline" asChild>
							<Link to={'..'}>Cancelar</Link>
						</Button>
						{/* CHANGE THIS BUTTON TO STATE BUTTON AND POSSIBLY ADD A CONFIRM DIALOG */}

						<StatusButton
							form={form.id}
							type="submit"
							disabled={isPending}
							className="w-full"
							status={isPending ? 'pending' : 'idle'}
						>
							Crear Descuento
						</StatusButton>
					</CardFooter>
				</Card>
				{fields.discountScope.value !== DiscountScope.GLOBAL && (
					<div>
						{fields.discountScope.value === DiscountScope.SINGLE_ITEM ? (
							<ItemPicker
								errors={fields.itemIds.errors}
								setAddedItemsIds={setAddedItemsIds}
							/>
						) : (
							<CategoryPicker
								setAddedCategoriesIds={setAddedCategoriesIds}
								errors={fields.categoryIds.errors}
							/>
						)}
					</div>
				)}
			</main>
		</>
	)
}

function BreadCrumbs() {
	return (
		<Breadcrumb className="hidden md:flex">
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link to="/discounts">Descuentos</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link className="text-foreground" to=".">
							Registrar Descuento
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}
