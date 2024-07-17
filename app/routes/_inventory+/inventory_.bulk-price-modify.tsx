import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '#app/components/ui/tabs.tsx'
import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency, useIsPending } from '#app/utils/misc.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import {
	getFormProps,
	getInputProps,
	useForm,
	useInputControl,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import {
	Form,
	json,
	Link,
	redirect,
	useActionData,
	useLoaderData,
} from '@remix-run/react'

import { ChangeEvent, useState } from 'react'
import { z } from 'zod'
import {
	BulkPriceModificationDirection,
	BulkPriceModificationDirectionSchema,
} from './types/BulkPriceModificationDirection'
import {
	BulkPriceModificationScope,
	BulkPriceModificationScopeSchema,
} from './types/BulkPriceModificationScope'
import {
	BulkPriceModificationStrategy,
	BulkPriceModificationStrategySchema,
} from './types/BulkPriceModificationStrategy'
import { BulkPriceModificationStatus } from './types/BulkPriceModificationStatus'
import { StatusButton } from '#app/components/ui/status-button.tsx'

const setupBulkPriceModificationActionIntent = 'setup-bulk-price-adjustment'

const PriceBulkModificationSchema = z.object({
	intent: z.literal(setupBulkPriceModificationActionIntent),
	scope: BulkPriceModificationScopeSchema,
	strategy: BulkPriceModificationStrategySchema,
	direction: BulkPriceModificationDirectionSchema,
	affectedCategoriesIds: z.string().optional(),
	adjustmentValue: z.number(),
})

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	// const url = new URL(request.url)

	// const query = url.searchParams.get('query')
	// invariant(typeof query === 'string', 'query is required')

	const categories = await prisma.category.findMany({
		where: { businessId },
		select: { id: true, description: true },
	})

	return { categories }
}

export async function action({ request }: ActionFunctionArgs) {
	console.log('ACTION CALLED!')
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)
	const formData = await request.formData()
	const intent = formData.get('intent')

	invariantResponse(intent, 'Intent should be defined.')

	switch (intent) {
		case setupBulkPriceModificationActionIntent: {
			return await setupBulkPriceModificationAction({
				formData,
				businessId,
				userId,
			})
		}
		// case editCategoryActionIntent: {
		// 	return await editCategoryAction(formData, businessId)
		// }
	}

	return null
}

export default function ModifyProductPriceInBulk() {
	const { categories } = useLoaderData<typeof loader>()
	const [selectedCategoriesIds, setSelectedCategoriesIds] = useState<string[]>(
		[],
	)

	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [form, fields] = useForm({
		id: 'bulk-price-modification-settings',
		constraint: getZodConstraint(PriceBulkModificationSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: PriceBulkModificationSchema })
		},

		defaultValue: {
			scope: BulkPriceModificationScope.INVENTORY,
			direction: BulkPriceModificationDirection.INCREASE,
			strategy: BulkPriceModificationStrategy.PERCENTAGE,
			adjustmentValue: 0,
			affectedCategoriesIds: '',
		},
	})

	const scope = useInputControl(fields.scope)
	const direction = useInputControl(fields.direction)
	const strategy = useInputControl(fields.strategy)

	///////////////////////////////
	const handleSelectCategory = (e: ChangeEvent<HTMLInputElement>) => {
		const { value, checked } = e.target

		setSelectedCategoriesIds(prevSelected => {
			if (checked) {
				return [...prevSelected, value]
			} else {
				return prevSelected.filter(id => id !== value)
			}
		})
	}
	const handleSelectAll = () => {
		setSelectedCategoriesIds([...categories.map(category => category.id)])
	}

	const allCategoriesSelected =
		categories.length === selectedCategoriesIds.length

	return (
		<main className="flex h-full  flex-col gap-4">
			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
				<h1 className="text-xl font-semibold">
					Administración de Inventario - Modificación masiva de precios
				</h1>
				<Button
					asChild
					className="flex h-7 items-center gap-2"
					variant={'outline'}
				>
					<Link to={'history'}>
						<Icon className="" name="file-text" />
						<span>Historial de modificaciones</span>
					</Link>
				</Button>
			</div>
			<div className="grid h-full grid-cols-1 gap-4  sm:grid-cols-5 ">
				<Form
					method="POST"
					{...getFormProps(form)}
					className="col-span-2 flex flex-col gap-2  "
				>
					<input
						{...getInputProps(fields.affectedCategoriesIds, { type: 'hidden' })}
						value={JSON.stringify(selectedCategoriesIds)}
					/>
					<p className="text-sm font-semibold text-foreground">
						Alcance de la modificación
					</p>
					<div className="flex-1">
						<Tabs
							defaultValue={fields.scope.initialValue}
							value={scope.value}
							onValueChange={scope.change}
							className="flex  w-full flex-col "
						>
							<TabsList>
								<TabsTrigger
									className="w-full"
									value={BulkPriceModificationScope.INVENTORY}
								>
									Inventario Completo
									<Icon name="package" className="ml-2" size="sm" />
								</TabsTrigger>
								<TabsTrigger
									className="w-full"
									value={BulkPriceModificationScope.CATEGORY}
								>
									Por categorías
									<Icon name="shapes" className="ml-2" size="sm" />
								</TabsTrigger>
							</TabsList>
							<TabsContent value={BulkPriceModificationScope.INVENTORY}>
								<div className="flex flex-1 flex-col items-center justify-center gap-2 overflow-y-auto text-balance p-12 text-center text-muted-foreground">
									Se incluirán todos los productos registrados en inventario.
								</div>
							</TabsContent>
							<TabsContent
								className="flex flex-col p-4 "
								value={BulkPriceModificationScope.CATEGORY}
							>
								<div>
									<p className="text-sm">
										Seleccione las categorías que desea incluir en la
										modificación:
									</p>
								</div>
								<div className="flex flex-1  flex-wrap items-center justify-center gap-2 overflow-y-auto p-4">
									{categories.map(category => (
										<Label
											key={category.id}
											htmlFor={category.id}
											className="w-fit cursor-pointer select-none rounded-md border-2 border-dashed p-2 transition-colors hover:bg-secondary has-[:checked]:border-solid  has-[:checked]:bg-primary has-[:checked]:text-background "
										>
											<input
												className="hidden"
												type="checkbox"
												id={category.id}
												value={category.id}
												onChange={handleSelectCategory}
												checked={selectedCategoriesIds.includes(category.id)}
											/>

											{category.description}
										</Label>
									))}
								</div>

								<div className="flex flex-col items-center">
									<p className="text-center text-foreground">
										<span className="font-bold">
											{selectedCategoriesIds.length} de {categories.length}
										</span>{' '}
										categorías seleccionadas
									</p>
									{allCategoriesSelected ? (
										<Button
											size={'sm'}
											className="h-7 text-muted-foreground"
											variant={'ghost'}
											onClick={() => setSelectedCategoriesIds([])}
										>
											Quitar todas
										</Button>
									) : (
										<Button
											size={'sm'}
											className="h-7 text-muted-foreground"
											variant={'ghost'}
											onClick={handleSelectAll}
										>
											Seleccionar todas
										</Button>
									)}
								</div>
							</TabsContent>
						</Tabs>

						<div className=" flex flex-col gap-2">
							<p className="text-sm font-semibold text-foreground">
								Tipo de modificación
							</p>
							<Tabs
								defaultValue={fields.direction.initialValue}
								value={direction.value}
								onValueChange={direction.change}
								className="mb-6  flex w-full flex-col"
							>
								<TabsList className="w-full">
									<TabsTrigger
										className="w-full"
										value={BulkPriceModificationDirection.INCREASE}
									>
										Incremento de precio
										<Icon name="arrow-up" className="ml-2" size="sm" />
									</TabsTrigger>
									<TabsTrigger
										className="w-full"
										value={BulkPriceModificationDirection.DECREASE}
									>
										Disminución de precio
										<Icon name="arrow-down" className="ml-2" size="sm" />
									</TabsTrigger>
								</TabsList>
							</Tabs>
							<Tabs
								defaultValue={fields.strategy.initialValue}
								value={strategy.value}
								onValueChange={strategy.change}
								className="mb-6  flex w-full flex-col"
							>
								<TabsList>
									<TabsTrigger
										className="w-full"
										value={BulkPriceModificationStrategy.PERCENTAGE}
									>
										Porcentual{' '}
										<Icon name="percentage" className="ml-2" size="sm" />
									</TabsTrigger>
									<TabsTrigger
										className="w-full"
										value={BulkPriceModificationStrategy.FIXED_AMOUNT}
									>
										Valor Fijo{' '}
										<Icon name="report-money" className="ml-2" size="sm" />
									</TabsTrigger>
								</TabsList>
								<TabsContent value={BulkPriceModificationStrategy.PERCENTAGE}>
									<Input
										{...getInputProps(fields.adjustmentValue, {
											type: 'number',
										})}
										placeholder="Valor Porcentual"
									/>
									<p className="text-xs text-muted-foreground">
										Se redondearan los valores según sea necesario.{' '}
									</p>
								</TabsContent>
								<TabsContent value={BulkPriceModificationStrategy.FIXED_AMOUNT}>
									<Input
										{...getInputProps(fields.adjustmentValue, {
											type: 'number',
										})}
										placeholder="Valor Fijo"
									/>
								</TabsContent>
							</Tabs>
						</div>
					</div>
					<div className="flex flex-col-reverse sm:flex-row justify-start gap-6 ">
						<Button asChild variant={'ghost'} size={'lg'}>
							<Link to={"/inventory"}>Descartar modificación</Link>
						</Button>

						<StatusButton
							className="w-full"
							iconName="arrow-right"
							form={form.id}
							type="submit"
							name="intent"
							value={setupBulkPriceModificationActionIntent}
							status={isPending ? 'pending' : form.status ?? 'idle'}
							disabled={isPending}
						>
							<span>
								{isPending ? 'Preparando...' : 'Preparar modificación masiva'}
							</span>
						</StatusButton>
					</div>
				</Form>
			</div>
		</main>
	)
}

async function setupBulkPriceModificationAction({
	formData,
	businessId,
	userId,
}: {
	formData: FormData
	businessId: string
	userId: string
}) {
	const submission = await parseWithZod(formData, {
		schema: PriceBulkModificationSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { adjustmentValue, direction, scope, strategy, affectedCategoriesIds } =
		submission.value

	const affectedCategories = affectedCategoriesIds
		? (JSON.parse(affectedCategoriesIds) as string[])
		: []

	const affectedProducts = await prisma.product.findMany({
		where: {
			businessId,
			isDeleted: false,
			...(scope === BulkPriceModificationScope.CATEGORY
				? { categoryId: { in: affectedCategories } }
				: {}),
		},
		include: { productAnalytics: true },
	})

	const newBulkPriceModification = await prisma.bulkPriceModification.create({
		data: {
			adjustmentValue,
			affectedProductsCount: affectedProducts.length, //update this after
			direction,
			scope,
			type: strategy,
			status: BulkPriceModificationStatus.PENDING,
			executedBy: userId,
			priceModifications: {
				create: affectedProducts.map(product => ({
					oldPrice: product.sellingPrice,
					newPrice: calculateNewSellingPrice({
						oldSellingPrice: product.sellingPrice,
						adjustmentValue,
						strategy,
						direction,
					}),
					productAnalytics: { connect: { id: product.productAnalytics?.id } },
				})),
			},
			business: { connect: { id: businessId } },
		},
		select: { id: true },
	})

	//we should only create/connect to PriceModification per item when EXECUTING the modification, so in the ID page.

	//we create the connection to price modification here per product involved.
	//we apply the actual price reduction on EXECUTION
	//we delete the connections on the products that were deselected

	//redirect to it
	return redirect(`/inventory/bulk-price-modify/${newBulkPriceModification.id}`)
}

const calculateNewSellingPrice = ({
	oldSellingPrice,
	adjustmentValue,
	strategy,
	direction,
}: {
	oldSellingPrice: number
	adjustmentValue: number
	strategy: BulkPriceModificationStrategy
	direction: BulkPriceModificationDirection
}) => {
	let sellingPriceChange = 0

	switch (strategy) {
		case BulkPriceModificationStrategy.FIXED_AMOUNT:
			sellingPriceChange = adjustmentValue
			break
		case BulkPriceModificationStrategy.PERCENTAGE:
			sellingPriceChange = Math.round((oldSellingPrice * adjustmentValue) / 100)
			break
		default:
			throw new Error('Invalid strategy')
	}

	let newSellingPrice =
		direction === BulkPriceModificationDirection.INCREASE
			? oldSellingPrice + sellingPriceChange
			: Math.max(0, oldSellingPrice - sellingPriceChange)

	// Round to nearest 10 if percentage
	if (strategy === BulkPriceModificationStrategy.PERCENTAGE) {
		newSellingPrice = Math.round(newSellingPrice / 10) * 10
	}

	return newSellingPrice
}
