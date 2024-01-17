import { Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { DatePickerWithRange } from '#app/components/ui/date-picker.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { SelectTab } from '#app/components/ui/select-tab.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { invariant, useIsPending } from '#app/utils/misc.tsx'
import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { Discount } from '@prisma/client'
import {
	json,
	type ActionFunctionArgs,
	type SerializeFrom,
	redirect,
} from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { addDays } from 'date-fns'
import { useState } from 'react'
import { DateRange } from 'react-day-picker'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { CategoryPicker } from './category-picker.tsx'
import { ItemPicker } from './item-picker.tsx'

const descriptionMinLength = 3
const descriptionMaxLength = 100

const DiscountEditorSchema = z.object({
	id: z.string().optional(),
	minQuantity: z
		.number({ required_error: 'Campo obligatorio' })
		.min(1, { message: 'El mínimo aplicable es 1.' }),
	description: z
		.string({ required_error: 'Campo obligatorio' })
		.min(descriptionMinLength, {
			message: `Debe tener al menos ${descriptionMinLength} caracteres`,
		})
		.max(descriptionMaxLength, {
			message: `Debe tener un máximo de ${descriptionMaxLength} caracteres`,
		}),

	fixedValue: z
		.number({ required_error: 'Campo obligatorio' })
		.min(1, { message: 'El mínimo aplicable es 1.' })
		.optional(),

	//! We will need to superRefine and add issue when the value of the fixed discount is greater than the item price
	porcentualValue: z
		.number({ required_error: 'Campo obligatorio' })
		.min(1, { message: 'El mínimo aplicable es 1.' })
		.max(100, { message: 'El máximo aplicable es 100.' })
		.optional(),

	discountType: z.string(),
	discountReach: z.string(),
	discountTarget: z.string(),
	validFrom: z.coerce.date(),
	validUntil: z.coerce.date(),
	// validFrom: z.string().datetime(),
	// validUntil: z.string().datetime(),
	itemIds: z.string().optional(),
	categoryIds: z.string().optional(),
})

export async function action({ request }: ActionFunctionArgs) {
	await requireUserId(request)

	const formData = await request.formData()
	console.log(formData)
	await validateCSRF(formData, request.headers)

	// // const submission = await parse(formData, {
	// // 	schema: ItemEditorSchema.superRefine(async (data, ctx) => {
	// // 		const itemByCode = await prisma.item.findUnique({
	// // 			select: { id: true, code: true },
	// // 			where: { code: data.code },
	// // 		})

	// // 		if (itemByCode && itemByCode.id !== data.id) {
	// // 			ctx.addIssue({
	// // 				path: ['code'],
	// // 				code: z.ZodIssueCode.custom,
	// // 				message: 'El código ya existe.',
	// // 			})
	// // 		}
	// // 	}),
	// 	async: true,
	// })
	const submission = await parse(formData, {
		schema: DiscountEditorSchema,
	})
	console.log(submission)

	if (submission.intent !== 'submit') {
		return json({ submission } as const)
	}

	if (!submission.value) {
		return json({ submission } as const, { status: 400 })
	}

	const {
		minQuantity,
		description,
		discountReach,
		discountTarget,
		discountType,
		validFrom,
		validUntil,
		categoryIds,
		fixedValue,
		id,
		itemIds,
		porcentualValue,
	} = submission.value

	const isCategoryDiscount =
		discountReach === 'by-category' && categoryIds !== undefined

	const isFixedDiscount = discountType === 'fixed'

	const value = isFixedDiscount ? fixedValue : porcentualValue
	invariant(value !== undefined, 'value should be defined')

	if (isCategoryDiscount) {
		const categoryIdsArray = categoryIds.split(',')

		const discount = await prisma.discount.upsert({
			select: { id: true },
			where: { id: id ?? '__new_discount__' },
			create: {
				minQuantity,
				description,
				reach: discountReach,
				target: discountTarget,
				type: discountType,
				validFrom,
				validUntil,
				families: {
					connect: categoryIdsArray.map(id => ({ id })),
				},
				value,
			},
			update: {
				minQuantity,
				description,
				reach: discountReach,
				target: discountTarget,
				type: discountType,
				validFrom,
				validUntil,
				families: {
					connect: categoryIdsArray.map(id => ({ id })),
				},
				value,
			},
		})
		return redirect(`/system/discounts/${discount.id}`)
	}
	invariant(itemIds !== undefined, 'item Ids should be defined')
	const itemIdsArray = itemIds.split(',')
	const discount = await prisma.discount.upsert({
		select: { id: true },
		where: { id: id ?? '__new_discount__' },
		create: {
			minQuantity,
			description,
			reach: discountReach,
			target: discountTarget,
			type: discountType,
			validFrom,
			validUntil,
			items: {
				connect: itemIdsArray.map(id => ({ id })),
			},
			value,
		},
		update: {
			minQuantity,
			description,
			reach: discountReach,
			target: discountTarget,
			type: discountType,
			validFrom,
			validUntil,
			items: {
				connect: itemIdsArray.map(id => ({ id })),
			},
			value,
		},
	})

	return redirect(`/system/discounts/${discount.id}`)
}

export function DiscountsEditor({
	discount,
}: {
	discount?: SerializeFrom<
		Pick<
			Discount,
			| 'id'
			| 'description'
			| 'type'
			| 'target'
			| 'validFrom'
			| 'validUntil'
			| 'minQuantity'
			| 'value'
			| 'reach'
			| 'isActive'
		>
	>
}) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [form, fields] = useForm({
		id: 'discount-editor',
		constraint: getFieldsetConstraint(DiscountEditorSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: DiscountEditorSchema })
		},

		defaultValue: {
			// code: category?.code ?? '',
			// description: category?.description ?? '',
		},
	})

	const [selectedDiscountType, setSelectedDiscountType] = useState('percentage')
	const [selectedDiscountReach, setSelectedDiscountReach] =
		useState('by-category')
	const [selectedDiscountTarget, setSelectedDiscountTarget] =
		useState('by-unit')

	const [addedItemsIds, setAddedItemsIds] = useState<string>('')
	const [addedCategoriesIds, setAddedCategoriesIds] = useState<string>('')

	const defaultRange = 7
	const [discountPeriod, setDiscountPeriod] = useState<DateRange | undefined>({
		from: new Date(),
		to: addDays(new Date(), defaultRange),
	})

	const resetAllFields = () => {}

	return (
		<div className="flex flex-col gap-4 p-6">
			<div className="flex flex-col gap-2 md:flex-row">
				<SelectTab
					name="discount-type"
					selected={selectedDiscountType}
					setSelected={setSelectedDiscountType}
					options={[
						{ label: 'Porcentaje', value: 'percentage' },
						{ label: 'Fijo', value: 'fixed' },
					]}
				/>
				<SelectTab
					name={'discount-target'}
					selected={selectedDiscountTarget}
					setSelected={setSelectedDiscountTarget}
					options={[
						{ label: 'Por Unidad', value: 'by-unit' },
						{ label: 'Al Total', value: 'by-total' },
					]}
				/>
			</div>
			<SelectTab
				name={'discount-reach'}
				selected={selectedDiscountReach}
				setSelected={setSelectedDiscountReach}
				options={[
					{ label: 'Por Categoría', value: 'by-category' },
					{ label: 'Por Artículo(s)', value: 'by-item' },
				]}
			/>

			{selectedDiscountReach === 'by-item' ? (
				<ItemPicker setAddedItemsIds={setAddedItemsIds} />
			) : (
				<CategoryPicker setAddedCategoriesIds={setAddedCategoriesIds} />
			)}

			<Form className="mt-5" method="POST" {...form.props}>
				<AuthenticityTokenInput />
				{discount ? (
					<input type="hidden" name="id" value={discount.id} />
				) : null}
				<input type="hidden" name="discountType" value={selectedDiscountType} />
				<input
					type="hidden"
					name="discountReach"
					value={selectedDiscountReach}
				/>
				<input
					type="hidden"
					name="discountTarget"
					value={selectedDiscountTarget}
				/>
				<input
					type="hidden"
					name="validFrom"
					value={discountPeriod?.from?.toISOString()}
				/>
				<input
					type="hidden"
					name="validUntil"
					value={discountPeriod?.to?.toISOString()}
				/>
				{selectedDiscountReach === 'by-item' ? (
					<input type="hidden" name="itemIds" value={addedItemsIds} />
				) : (
					<input type="hidden" name="categoryIds" value={addedCategoriesIds} />
				)}
				{selectedDiscountType === 'fixed' ? (
					<Field
						labelProps={{ children: 'Valor descuento fijo' }}
						inputProps={{
							type: 'number',
							...conform.input(fields.fixedValue, {
								ariaAttributes: true,
							}),
						}}
						errors={fields.fixedValue.errors}
					/>
				) : (
					<Field
						labelProps={{ children: 'Valor descuento porcentual' }}
						inputProps={{
							type: 'number',
							...conform.input(fields.porcentualValue, {
								ariaAttributes: true,
							}),
						}}
						errors={fields.porcentualValue.errors}
					/>
				)}
				<Field
					labelProps={{ children: 'Cantidad minima requerida' }}
					inputProps={{
						type: 'number',
						...conform.input(fields.minQuantity, {
							ariaAttributes: true,
						}),
					}}
					errors={fields.minQuantity.errors}
				/>
				<Field
					labelProps={{ children: 'Nombre / Descripción' }}
					inputProps={{
						...conform.input(fields.description, {
							ariaAttributes: true,
						}),
					}}
					errors={fields.description.errors}
				/>
			</Form>

			<DatePickerWithRange
				date={discountPeriod}
				setDate={setDiscountPeriod}
				label="Periodo de validez"
			/>
			<div className=" mt-5 flex justify-between">
				<Button
					form={form.id}
					variant="ghost"
					type="reset"
					onClick={() => resetAllFields()}
				>
					Restaurar
				</Button>
				<StatusButton
					form={form.id}
					type="submit"
					status={isPending ? 'pending' : 'idle'}
				>
					<Icon name="check" className="mr-2" />{' '}
					{discount ? 'Actualizar' : 'Crear Descuento'}
				</StatusButton>
			</div>
		</div>
	)
}
