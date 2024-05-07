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
import { Form, Link, useActionData } from '@remix-run/react'
import { useState } from 'react'
import { DiscountScope, DiscountScopeSchema } from './_types/discount-reach.ts'
import { DiscountType, DiscountTypeSchema } from './_types/discount-type.ts'
import { Field } from '#app/components/forms.tsx'
import { z } from 'zod'
import { ActionFunctionArgs } from '@remix-run/node'
import { useIsPending } from '#app/utils/misc.tsx'

import { DatePickerWithRange } from '#app/components/ui/date-picker.tsx'
import { addDays } from 'date-fns'
import { DateRange } from 'react-day-picker'
import { ItemPicker } from './discounts.item-picker.tsx'
import { CategoryPicker } from './category-picker.tsx'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '#app/components/ui/breadcrumb.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'

export async function action({ request }: ActionFunctionArgs) {
	return null
}

const DEFAULT_MIN_QUANTITY_REQUIRED = 1
const DEFAULT_FIXED_DISCOUNT_VALUE = 0
const DEFAULT_PERCENTAGE_DISCOUNT_VALUE = 0

const DESCRIPTION_MIN_LENGTH = 10
const DESCRIPTION_MAX_LENGTH = 100

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
	description: z
		.string({ required_error: 'Campo obligatorio' })
		.min(DESCRIPTION_MIN_LENGTH, {
			message: `Debe tener al menos ${DESCRIPTION_MIN_LENGTH} caracteres`,
		})
		.max(DESCRIPTION_MAX_LENGTH, {
			message: `Debe tener un máximo de ${DESCRIPTION_MAX_LENGTH} caracteres`,
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
	validFrom: z.coerce.date(),
	validUntil: z.coerce.date(),
	itemIds: z.string().optional(),
	categoryIds: z.string().optional(),
})

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
			// code: category?.code ?? '',
			// description: category?.description ?? '',
		},
	})

	const [discountType, setDiscountType] = useState<DiscountType>(
		DiscountType.FIXED,
	)
	const [discountScope, setDiscountScope] = useState<DiscountScope>(
		DiscountScope.GLOBAL,
	)
	const defaultRange = 7
	const [discountPeriod, setDiscountPeriod] = useState<DateRange | undefined>({
		from: new Date(),
		to: addDays(new Date(), defaultRange),
	})
	const description = 'CHANGE_THIS_DESCRIPTION'

	const [addedItemsIds, setAddedItemsIds] = useState<string>('')
	const [addedCategoriesIds, setAddedCategoriesIds] = useState<string>('')

	console.log(addedItemsIds)

	//TODO: we need to keep track of the input fields in order to 'compose' a preview Discount object that will be sent to the item/category picker, so it can show preview results of the applied discount.
	//TODO: we might do this by tracking every state and making the inputs controlled, or we might try to find a way to read the conform field values, although it seems difficult.
	return (
		<>
			<BreadCrumbs />
			<Spacer size="4xs" />
			<main className="flex max-h-[40rem] flex-col  gap-4 lg:flex-row lg:gap-8">
				<Card className="w-full lg:max-w-xl">
					<CardHeader>
						<CardTitle>Registrar Descuento</CardTitle>
						<CardDescription>
							Complete la información para ingresar el nuevo descuento en
							sistema.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Form className="grid " {...getFormProps(form)}>
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
							<input type="hidden" name="description" value={description} />
							<div className="mb-5 space-y-2">
								<SelectTab
									label="Alcance del descuento"
									options={[
										{
											label: 'Global',
											value: DiscountScope.GLOBAL,
											icon: 'world',
										},
										{
											label: 'Por Categoría',
											value: DiscountScope.CATEGORY,
											icon: 'shapes',
										},
										{
											label: 'Por Articulo',
											value: DiscountScope.SINGLE_ITEM,
											icon: 'package',
										},
									]}
									name={'discount-scope'}
									selected={discountScope}
									setSelected={setDiscountScope}
								/>
								<SelectTab
									label="Tipo de descuento"
									options={[
										{
											label: 'Fijo',
											value: DiscountType.FIXED,
											icon: 'circle-dollar-sign',
										},
										{
											label: 'Porcentaje',
											value: DiscountType.PERCENTAGE,
											icon: 'percentage',
										},
									]}
									name={'discount-type'}
									selected={discountType}
									setSelected={setDiscountType}
								/>
							</div>
							<div className="grid grid-cols-2 gap-4">
								{discountType === DiscountType.FIXED ? (
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
						<Button className="w-full">Crear Descuento</Button>
					</CardFooter>
				</Card>
				{discountScope !== DiscountScope.GLOBAL && (
					<div>
						{discountScope === DiscountScope.SINGLE_ITEM ? (
							<ItemPicker setAddedItemsIds={setAddedItemsIds} />
						) : (
							<CategoryPicker setAddedCategoriesIds={setAddedCategoriesIds} />
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
