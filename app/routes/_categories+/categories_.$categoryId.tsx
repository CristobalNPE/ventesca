import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { MetaFunction, Outlet, useLoaderData } from '@remix-run/react'
import { endOfWeek, startOfWeek } from 'date-fns'

import { ContentLayout } from '#app/components/layout/content-layout.tsx'
import { MetricCard } from '#app/components/metric-card.js'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	CategoryProvider,
	useCategory,
} from '#app/context/categories/CategoryContext.tsx'
import {
	getCategoryProfitAnalytics,
	getCategoryTotalPriceAndCost,
	getMostSoldProductInCategory,
} from '#app/services/categories/category-analytics.server.ts'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency } from '#app/utils/misc.js'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { useIsUserAdmin } from '#app/utils/user.ts'

import { CategoryAssociatedProductsTable } from '#app/components/categories/category-associated-products-table.tsx'
import {
	DeleteCategory,
	deleteCategoryActionIntent,
	DeleteCategorySchema,
} from '#app/components/categories/category-delete.tsx'
import { getDefaultCategory } from '#app/services/categories/categories-queries.server.js'

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

	const currentWeekStartDate = startOfWeek(startDate, { weekStartsOn: 1 })
	const currentWeekEndDate = endOfWeek(startDate, { weekStartsOn: 1 })

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
			return await deleteCategoryAction({ formData, businessId })
		}
	}
}

export default function CategoryRoute() {
	const loaderData = useLoaderData<typeof loader>()

	return (
		<CategoryProvider data={loaderData}>
			<ContentLayout
				title={loaderData.category.name}
				actions={<CategoryActions />}
			>
				<main className="grid gap-4">
					<section className="grid gap-4 lg:grid-cols-2">
						<Outlet />
						<aside className="flex flex-col justify-start gap-4">
							{loaderData.mostSoldData &&
							loaderData.mostSoldData?.totalQuantitySold > 0 ? (
								<MetricCard
									title={loaderData.mostSoldData.mostSoldProduct.name}
									description="Producto mas vendido esta semana."
									value={loaderData.mostSoldData.totalQuantitySold.toString()}
									subText={
										loaderData.mostSoldData.totalQuantitySold === 1
											? 'unidad vendida'
											: 'unidades vendidas'
									}
									icon="medal"
								/>
							) : (
								<MetricCard
									value="Sin datos de venta esta semana"
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
			</ContentLayout>
		</CategoryProvider>
	)
}

function CategoryActions() {
	const isAdmin = useIsUserAdmin()
	const { category } = useCategory()
	const canDelete = isAdmin && !category.isEssential

	return <>{canDelete && <DeleteCategory />}</>
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	return [{ title: `Categorías: ${data?.category.name} | Ventesca` }]
}

async function deleteCategoryAction({
	formData,
	businessId,
}: {
	formData: FormData
	businessId: string
}) {
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
		select: { id: true, name: true, products: true },
		where: { id: categoryId },
	})
	const defaultCategory = await getDefaultCategory(businessId)

	invariantResponse(category, 'Category not found', { status: 404 })

	await prisma.$transaction(async (tx) => {
		//Move all products to general category
		await tx.product.updateMany({
			where: { categoryId: category.id },
			data: { categoryId: defaultCategory.id },
		})

		await tx.category.delete({ where: { id: category.id } })
	})

	const description =
		category.products.length === 0
			? `Categoría "${category.name}" eliminada.`
			: category.products.length === 1
				? `Categoría "${category.name}" eliminada. Producto '${category.products[0]!.name}' movido a '${defaultCategory.name}'`
				: `Categoría "${category.name}" eliminada. ${category.products.length} productos movidos a '${defaultCategory.name}'`

	return redirectWithToast(`/categories`, {
		type: 'success',
		title: 'Categoría eliminada',
		description,
	})
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
