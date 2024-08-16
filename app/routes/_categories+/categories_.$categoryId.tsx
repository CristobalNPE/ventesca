import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { type Product } from '@prisma/client'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Link, MetaFunction, useLoaderData } from '@remix-run/react'
import { endOfWeek, startOfWeek, subWeeks } from 'date-fns'
import { z } from 'zod'

import { CategoryAssociatedProductsTable } from '#app/components/categories/category-associated-products-table.tsx'
import { CategoryDetails } from '#app/components/categories/category-details.tsx'
import { ContentLayout } from '#app/components/layout/content-layout.tsx'
import { MetricCard } from '#app/components/metric-card.js'
import { Icon } from '#app/components/ui/icon.tsx'
import { CategoryProvider } from '#app/context/categories/CategoryContext.tsx'
import {
	getCategoryProfitAnalytics,
	getCategoryTotalPriceAndCost,
	getMostSoldProductInCategory,
} from '#app/services/categories/category-analytics.server.ts'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { useIsUserAdmin } from '#app/utils/user.ts'
import { OrderStatus } from '../../types/orders/order-status.ts'
import {
	DeleteCategory,
	deleteCategoryActionIntent,
	DeleteCategorySchema,
} from './__delete-category.tsx'
import {
	editCategoryActionIntent,
	EditCategorySchema,
} from './__edit-category.tsx'
import { formatCurrency } from '#app/utils/misc.js'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const category = await prisma.category.findUnique({
		where: { id: params.categoryId, businessId },
		select: {
			id: true,
			code: true,
			name: true,
			colorCode: true,
			description: true,
			createdAt: true,
			updatedAt: true,
			products: {
				select: {
					id: true,
					code: true,
					name: true,
					stock: true,
					isActive: true,
					sellingPrice: true,
				},
				where: { isDeleted: false },
			},
			isEssential: true,
		},
	})

	invariantResponse(category, 'Not found', { status: 404 })

	let startDate = new Date()

	const currentWeekStartDate = startOfWeek(startDate)
	const currentWeekEndDate = endOfWeek(startDate)

	const mostSoldData = await getMostSoldProductInCategory({
		categoryId: category.id,
		startDate: currentWeekStartDate,
		endDate: currentWeekEndDate,
	})

	const totalPriceAndCost = await getCategoryTotalPriceAndCost(category.id)
	const profitAnalytics = await getCategoryProfitAnalytics(category.id)

	return json({
		category,
		mostSoldData,
		totalPriceAndCost,
		profitAnalytics,
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
	const isAdmin = useIsUserAdmin()
	const loaderData = useLoaderData<typeof loader>()

	return (
		<ContentLayout
			title={loaderData.category.name}
			actions={isAdmin && <CategoryActions />}
		>
			<CategoryProvider data={loaderData}>
				<main className="grid gap-4">
					<section className="grid gap-4 lg:grid-cols-2">
						<CategoryDetails />
						<aside className="flex flex-col justify-start gap-4">
							{loaderData.mostSoldData &&
							loaderData.mostSoldData?.totalQuantitySold > 0 ? (
								<MetricCard
									title={loaderData.mostSoldData.mostSoldProduct.name}
									description="Producto mas vendido esta semana."
									value={loaderData.mostSoldData.totalQuantitySold.toString()}
									subText={loaderData.mostSoldData.totalQuantitySold === 1 ? 'unidad vendida' : 'unidades vendidas'}
									icon="medal"
								/>
							) : (
								<MetricCard
									value="Sin datos de venta"
									icon="exclamation-circle"
								/>
							)}

							<MetricCard
								title="Valor categoría"
								description="Valor de venta total de la categoría."
								value={formatCurrency(
									loaderData.totalPriceAndCost.totalSellingPrice,
								)}
								subText={`Costo: ${formatCurrency(loaderData.totalPriceAndCost.totalCost)}`}
								icon="currency-dollar"
							/>
							<MetricCard
								title="Ganancias ingresadas"
								description="Ganancias totales ingresadas por productos de la categoría."
								value={formatCurrency(loaderData.profitAnalytics.totalProfit)}
								subText={`Esta semana: ${formatCurrency(
									loaderData.profitAnalytics.totalProfitLastWeek,
								)}`}
								icon="moneybag"
							/>
						</aside>
					</section>
					<CategoryAssociatedProductsTable />
				</main>
			</CategoryProvider>
		</ContentLayout>
	)
}

function CategoryActions() {
	return (
		<>
			<ChangeItemsCategory />
			<DeleteCategory id={''} numberOfItems={0} />
		</>
	)
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	return [{ title: `Categorías: ${data?.category.name} | Ventesca` }]
}

function ChangeItemsCategory() {
	return (
		<Button asChild size="sm" variant="outline" className="h-8 gap-1">
			<Link target="_blank" reloadDocument to={``}>
				<Icon name="transfer" className="h-3.5 w-3.5" />
				<span className="lg:sr-only xl:not-sr-only xl:whitespace-nowrap">
					Transferir artículos
				</span>
			</Link>
		</Button>
	)
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
