import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { type Product } from '@prisma/client'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { endOfWeek, format, startOfWeek, subWeeks } from 'date-fns'
import { es } from 'date-fns/locale'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Progress } from '#app/components/ui/progress.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { userHasRole, useUser } from '#app/utils/user.ts'
import { ItemDetailsSheet } from '../_inventory+/product-sheet.tsx'
import { OrderStatus } from '../../types/orders/order-status.ts'
import {
	deleteCategoryActionIntent,
	DeleteCategory,
	DeleteCategorySchema,
} from './__delete-category.tsx'
import {
	editCategoryActionIntent,
	EditCategory,
	EditCategorySchema,
} from './__edit-category.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const category = await prisma.category.findUnique({
		where: { id: params.categoryId, businessId },
		select: {
			id: true,
			code: true,
			colorCode:true,
			description: true,
			createdAt: true,
			updatedAt: true,
			products: { select: { id: true, code: true, name: true } },
			isEssential: true,
		},
	})

	invariantResponse(category, 'Not found', { status: 404 })

	const categoryProducts = await prisma.product.findMany({
		where: { categoryId: params.categoryId },
		select: { id: true, code: true, name: true },
	})

	let startDate = new Date()

	const currentWeekStartDate = startOfWeek(startDate)
	const currentWeekEndDate = endOfWeek(startDate)

	const mostSoldProduct = await getMostSoldProductInCategoryData(
		categoryProducts,
		currentWeekStartDate,
		currentWeekEndDate,
	)

	return json({
		category,
		categoryProducts,
		mostSoldProduct,
	})
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)
	const formData = await request.formData()
	const intent = formData.get('intent')

	invariantResponse(intent, 'Intent should be defined.')

	switch (intent) {
		case deleteCategoryActionIntent: {
			return await deleteCategoryAction(formData)
		}
		case editCategoryActionIntent: {
			return await editCategoryAction(formData, businessId)
		}
	}
}

export default function CategoryRoute() {
	const user = useUser()
	const isAdmin = userHasRole(user, 'Administrador')
	const { category, categoryProducts, mostSoldProduct } =
		useLoaderData<typeof loader>()

	const percentageIncrease =
		mostSoldProduct && mostSoldProduct.quantitySoldPreviousWeek !== 0
			? Math.trunc(
					((mostSoldProduct.totalQuantitySold -
						mostSoldProduct.quantitySoldPreviousWeek) /
						mostSoldProduct.quantitySoldPreviousWeek) *
						100,
				)
			: undefined

	return (
		<Card className="flex h-[85dvh] animate-slide-left flex-col overflow-hidden">
			<CardHeader className="flex flex-row items-start justify-between bg-muted/50">
				<div className="grid gap-0.5">
					<CardTitle className="group flex items-center gap-2 text-lg">
						<div className="flex gap-4 text-lg">
							<input type='color' value={category.colorCode} />
							<span>{category.description}</span>
							<Badge
								variant={'secondary'}
								className="flex items-center justify-center gap-1"
							>
								<Icon className="shrink-0" name="scan-barcode" />
								{category.code}
							</Badge>
						</div>
						<Button
							size="icon"
							variant="outline"
							className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<Icon name="copy" className="h-3 w-3" />
							<span className="sr-only">Copiar código categoría</span>
						</Button>
					</CardTitle>
					<CardDescription>
						Fecha registro:
						{format(new Date(category.createdAt), " dd' de 'MMMM', 'yyyy", {
							locale: es,
						})}
					</CardDescription>
				</div>

				{isAdmin ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button size={'sm'} className="h-7 w-7" variant={'outline'}>
								<Icon className="shrink-0" name="dots-vertical" />
								<span className="sr-only">Opciones</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="flex flex-col gap-2 " align="end">
							{!category.isEssential ? (
								<DropdownMenuItem asChild>
									<EditCategory id={category.id} />
								</DropdownMenuItem>
							) : null}
							<DropdownMenuItem asChild>
								<ChangeItemsCategory />
							</DropdownMenuItem>
							{!category.isEssential ? (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem asChild>
										<DeleteCategory
											id={category.id}
											numberOfItems={category.products.length}
										/>
									</DropdownMenuItem>
								</>
							) : null}
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</CardHeader>
			{categoryProducts && mostSoldProduct ? (
				<CardContent className="grid flex-1 gap-10 p-6 text-sm xl:grid-cols-5">
					<div className="col-span-3">
						<Card>
							<CardHeader className="pb-2">
								<CardDescription>Articulo mas vendido</CardDescription>
								<CardTitle className="text-4xl">
									<Link
										prefetch={'intent'}
										to={`/inventory/${mostSoldProduct.id}`}
									>
										{mostSoldProduct.name}
									</Link>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex flex-col gap-1 text-xs text-muted-foreground">
									<span>
										{mostSoldProduct.totalQuantitySold !== 1
											? `${mostSoldProduct.totalQuantitySold} unidades vendidas esta
									semana.`
											: `${mostSoldProduct.totalQuantitySold} unidad vendida esta
									semana.`}
									</span>
									{percentageIncrease ? (
										<span>
											{percentageIncrease > 0
												? `+${percentageIncrease}% de aumento de ventas respecto la semana anterior.`
												: null}
										</span>
									) : null}
								</div>
							</CardContent>
							{percentageIncrease ? (
								<CardFooter>
									<Progress
										value={percentageIncrease > 100 ? 100 : percentageIncrease}
										aria-label={`${percentageIncrease}% increase`}
									/>
								</CardFooter>
							) : null}
						</Card>
					</div>

					<div className="col-span-2 flex flex-col gap-3">
						<div className="font-semibold">
							Artículos asociados ( {category.products.length} )
						</div>

						<ScrollArea className="h-[34.7rem]">
							<ul className="grid gap-3">
								{categoryProducts.map(product => (
									<li
										key={product.id}
										className="flex items-center justify-between rounded-sm transition-colors duration-100 hover:bg-secondary"
									>
										<div className="flex w-full items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												<ItemDetailsSheet itemId={product.id} />
												<span className="w-[14rem] text-muted-foreground">
													{product.name}
												</span>
											</div>
											<div className="flex  min-w-[4rem]  items-center gap-1 rounded-sm border-l-2 px-1">
												<Icon className="shrink-0" name="scan-barcode" />
												<span>{product.code}</span>
											</div>
										</div>
									</li>
								))}
							</ul>
						</ScrollArea>
					</div>
				</CardContent>
			) : (
				<CardContent className="flex w-full p-6 ">
					<div className="flex min-h-20 w-full flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-12 shadow-sm">
						Sin artículos registrados en categoría.
						<Button asChild>
							<Link to={'/inventory'}>Ir a inventario</Link>
						</Button>
					</div>
				</CardContent>
			)}
			<CardFooter className="flex flex-row items-center border-t bg-muted/50 px-6 py-3">
				<div className="text-xs text-muted-foreground">
					Actualizada por ultima vez el{' '}
					{format(
						new Date(category.updatedAt),
						"dd 'de' MMMM', 'yyyy' a las' hh:mm",
						{
							locale: es,
						},
					)}
				</div>
			</CardFooter>
		</Card>
	)
}

function ChangeItemsCategory() {
	return (
		<Button asChild size="sm" variant="ghost" className="h-8 gap-1">
			<Link target="_blank" reloadDocument to={``}>
				<Icon name="update" className="h-3.5 w-3.5" />
				<span className="lg:sr-only xl:not-sr-only xl:whitespace-nowrap">
					Mover artículos
				</span>
			</Link>
		</Button>
	)
}

async function getMostSoldProductInCategoryData(
	products: Pick<Product, 'id' | 'code' | 'name'>[],
	startDate: Date,
	endDate: Date,
) {
	if (!products || products.length === 0) {
		return null
	}

	const oneWeekBeforeStartDate = startOfWeek(subWeeks(startDate, 1))
	const oneWeekBeforeEndDate = endOfWeek(subWeeks(startDate, 1))

	const productsWithTotalQuantitySold = await Promise.all(
		products.map(async product => {
			const itemOrders = await prisma.productOrder.findMany({
				where: {
					productId: product.id,
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
					order: { status: OrderStatus.FINISHED },
				},
				select: { quantity: true },
			})

			const totalQuantitySold = itemOrders.reduce(
				(total, order) => total + order.quantity,
				0,
			)

			return { ...product, totalQuantitySold }
		}),
	)

	productsWithTotalQuantitySold.sort(
		(a, b) => b.totalQuantitySold - a.totalQuantitySold,
	)

	const mostSoldProduct =
		productsWithTotalQuantitySold.length > 0
			? productsWithTotalQuantitySold[0]
			: null

	if (!mostSoldProduct) return null

	const previousWeekData = await prisma.productOrder.findMany({
		where: {
			productId: mostSoldProduct.id,
			createdAt: {
				gte: oneWeekBeforeStartDate,
				lte: oneWeekBeforeEndDate,
			},
			order: { status: OrderStatus.FINISHED },
		},
		select: { quantity: true },
	})

	const quantitySoldPreviousWeek = previousWeekData.reduce(
		(total, transaction) => total + transaction.quantity,
		0,
	)

	return { ...mostSoldProduct, quantitySoldPreviousWeek }
}

async function deleteCategoryAction(formData: FormData) {
	const submission = parseWithZod(formData, {
		schema: DeleteCategorySchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { categoryId } = submission.value

	const category = await prisma.category.findFirst({
		select: { id: true, description: true },
		where: { id: categoryId },
	})

	invariantResponse(category, 'Category not found', { status: 404 })

	await prisma.category.delete({ where: { id: category.id } })

	return redirectWithToast(`/categories`, {
		type: 'success',
		title: 'Categoría eliminada',
		description: `Categoría "${category.description}" ha sido eliminada con éxito.`,
	})
}

async function editCategoryAction(formData: FormData, businessId: string) {
	const submission = await parseWithZod(formData, {
		schema: EditCategorySchema.superRefine(async (data, ctx) => {
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

	const { description, code, categoryId } = submission.value

	await prisma.category.update({
		where: { id: categoryId },
		data: { code, description },
	})

	return json({ result: submission.reply() })
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>No tiene los permisos necesarios.</p>,
				404: ({ params }) => (
					<div className="flex flex-col items-center justify-center gap-2">
						<Icon className="text-5xl" name="exclamation-circle" />
						<p>No existe categoría con ID:</p>
						<p className="text-lg">"{params.categoryId}"</p>
					</div>
				),
			}}
		/>
	)
}
