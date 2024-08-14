import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { MetaFunction, Outlet, useLoaderData } from '@remix-run/react'
import { z } from 'zod'

import { MetricCard } from '#app/components/metric-card.tsx'
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '#app/components/ui/alert.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import { processPriceHistory } from '#app/utils/inventory/product-calculations.js'
import { getProductAlerts } from '#app/utils/inventory/product-status.js'
import { userIsAdmin } from '#app/utils/user.ts'
import { useState } from 'react'
import { DeleteProductConfirmationModal } from '../../components/inventory/product-delete.tsx'
import { ProductDiscountsCard } from '../../components/inventory/product-discounts.tsx'
import { ModifyCategorySelect } from '../../components/inventory/product-modify-category.tsx'
import { ModifySellingPriceDialog } from '../../components/inventory/product-modify-sellingPrice.tsx'
import { ModifyStatusDialog } from '../../components/inventory/product-modify-status.tsx'
import { ModifyStockDialog } from '../../components/inventory/product-modify-stock.tsx'
import { ModifySupplierSelect } from '../../components/inventory/product-modify-supplier.tsx'
import { PriceModificationHistoryCard } from '../../components/inventory/product-price-modification-history.tsx'
import { ChartsCard } from '../../components/inventory/product-sales-chart.tsx'
import { ProductContext } from '../../context/inventory/ProductContext.tsx'
import { DiscountScope } from '../../types/discounts/discount-scope.ts'
import {
	getCurrentWeekProductSales,
	softDeleteProduct,
} from './product-service.server.ts'
import { ContentLayout } from '#app/components/layout/content-layout.js'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	invariantResponse(params.productId, 'Not found', { status: 404 })

	const productPromise = prisma.product.findUnique({
		where: { id: params.productId, businessId },
		select: {
			id: true,
			isActive: true,
			code: true,
			name: true,
			cost: true,
			stock: true,
			createdAt: true,
			updatedAt: true,
			sellingPrice: true,
			categoryId: true,
			supplierId: true,
			discounts: { select: { id: true, name: true } },
			category: { select: { description: true, id: true } },
			supplier: { select: { fantasyName: true, id: true } },
			productAnalytics: {
				select: {
					id: true,
					totalSales: true,
					totalProfit: true,
					totalReturns: true,
				},
			},
		},
	})

	const globalDiscountsPromise = prisma.discount.findMany({
		where: { scope: DiscountScope.GLOBAL },
		select: { id: true, name: true },
	})

	const businessCategoriesPromise = prisma.category.findMany({
		where: { businessId },
		select: { id: true, description: true },
	})
	const businessSuppliersPromise = prisma.supplier.findMany({
		where: { businessId },
		select: { id: true, fantasyName: true },
	})

	const [
		product,
		globalDiscounts,
		businessCategories,
		businessSuppliers,
		currentWeekSales,
	] = await Promise.all([
		productPromise,
		globalDiscountsPromise,
		businessCategoriesPromise,
		businessSuppliersPromise,
		getCurrentWeekProductSales({ productId: params.productId, businessId }),
	])

	invariantResponse(product, 'Not found', { status: 404 })
	const priceHistory = await prisma.priceModification.findMany({
		where: { productAnalyticsId: product.productAnalytics!.id },
		orderBy: { createdAt: 'desc' },
	})

	return json({
		product,
		globalDiscounts,
		businessCategories,
		businessSuppliers,
		priceHistory,
		currentWeekSales,
	})
}

const DeleteFormSchema = z.object({
	intent: z.literal('delete-product'),
	productId: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
	await requireUserId(request)
	const formData = await request.formData()

	const submission = parseWithZod(formData, {
		schema: DeleteFormSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { productId } = submission.value

	const product = await prisma.product.findFirst({
		select: { id: true, name: true },
		where: { id: productId },
	})
	invariantResponse(product, 'Not found', { status: 404 })

	await softDeleteProduct(productId)

	return redirectWithToast(`/inventory`, {
		type: 'success',
		title: 'Articulo eliminado',
		description: `Articulo ${product.name} ha sido eliminado con éxito.`,
	})
}

export default function ProductRoute() {
	const isAdmin = userIsAdmin()
	const {
		product,
		globalDiscounts,
		businessCategories,
		businessSuppliers,
		priceHistory,
		currentWeekSales,
	} = useLoaderData<typeof loader>()

	const [isActiveHovered, setIsActiveHovered] = useState(false)

	const alerts = getProductAlerts(product)

	const processedPriceHistory = processPriceHistory(priceHistory)
	const totalSales = product.productAnalytics?.totalSales ?? 0
	const totalReturns = product.productAnalytics?.totalReturns ?? 0

	return (
		<ProductContext.Provider value={{ product, isAdmin }}>
			<ContentLayout
				title={`Detalles de ${product.name}`}
				actions={isAdmin ? <DeleteProductConfirmationModal /> : null}
			>
				<div className="flex flex-col gap-4 ">
					
					<div className=" grid grid-cols-1 gap-4  md:grid-cols-2 xl:grid-cols-3 ">
						<ModifyStockDialog />
						<ModifySellingPriceDialog />
						<div
							onMouseEnter={() => setIsActiveHovered(true)}
							onMouseLeave={() => setIsActiveHovered(false)}
							className="md:col-span-2 xl:col-span-1 "
						>
							<ModifyStatusDialog />
						</div>
					</div>
					<div className="grid grid-cols-1 gap-y-4  md:grid-cols-3 md:gap-4">
						<div className="col-span-2 grid gap-4">
							<div>
								<Outlet />
							</div>
							<Card>
								<CardHeader>
									<CardTitle>Origen y Clasificación del Producto</CardTitle>
									<CardDescription>
										Categoría y proveedor asignados al producto.
									</CardDescription>
								</CardHeader>
								<CardContent className="flex flex-col gap-4 md:flex-row md:gap-12">
									<ModifyCategorySelect categories={businessCategories} />
									<ModifySupplierSelect suppliers={businessSuppliers} />
								</CardContent>
							</Card>
						</div>
						<div className="col-span-1 grid auto-rows-min gap-4">
							{alerts.some(alert => alert.condition) ? (
								<div
									className={cn(
										'flex h-fit flex-col gap-2 ',
										isActiveHovered &&
											'rounded-md bg-destructive/30 ring-2  ring-destructive/50 transition-all',
									)}
								>
									{alerts.map((alert, i) => {
										if (alert.condition) {
											return (
												<Alert
													key={i}
													variant="destructive"
													className="group animate-slide-left p-3 shadow-sm  transition-colors hover:bg-destructive hover:shadow-md"
												>
													<Icon
														name="alert-triangle"
														className="h-4 w-4 transition-all group-hover:translate-y-2 group-hover:scale-150"
													/>
													<AlertTitle className="font-bold transition-all duration-300 group-hover:translate-x-2">
														{alert.title}
													</AlertTitle>
													<AlertDescription className="transition-all duration-300 group-hover:translate-x-2">
														{alert.description}
													</AlertDescription>
												</Alert>
											)
										}
									})}
								</div>
							) : null}
							<ProductDiscountsCard
								associatedDiscounts={product.discounts}
								globalDiscounts={globalDiscounts}
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
						<MetricCard
							title={'Ventas Netas'}
							description="Total de ventas ajustado por devoluciones."
							value={totalSales}
							icon={'shopping-bag'}
						/>
						<MetricCard
							title={'Devoluciones'}
							description="Total de unidades devueltas."
							value={totalReturns}
							icon={'reset'}
						/>
						<div className="md:col-span-2 xl:col-span-1 ">
							<MetricCard
								title={'Ganancias'}
								description={`Generadas en ${totalSales + totalReturns} transacciones.`}
								value={formatCurrency(
									product.productAnalytics?.totalProfit ?? 0,
								)}
								icon={'moneybag'}
							/>
						</div>
					</div>
					<div className="grid grid-cols-1 gap-y-4  md:grid-cols-4 md:gap-4">
						<div className="col-span-2 grid gap-4">
							<ChartsCard currentWeekSales={currentWeekSales} />
						</div>
						<div className="col-span-2 grid gap-4">
							<PriceModificationHistoryCard
								priceHistory={processedPriceHistory}
							/>
						</div>
					</div>
				</div>
			</ContentLayout>
		</ProductContext.Provider>
	)
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	return [{ title: `${data?.product.name} | Ventesca` }]
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>No posee los permisos necesarios.</p>,
				404: ({ params }) => (
					<p>No existe articulo con ID: "{params.productId}"</p>
				),
			}}
		/>
	)
}
