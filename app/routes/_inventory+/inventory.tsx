import { ModifyProductPriceInBulkModal } from '#app/components/inventory/inventory-bulk-price-modify-modal.tsx'
import { CreateItemDialog } from '#app/components/inventory/product-create-single.tsx'
import { ContentLayout } from '#app/components/layout/content-layout.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import {
	type ActionFunctionArgs,
	unstable_createMemoryUploadHandler as createMemoryUploadHandler,
	json,
	type LoaderFunctionArgs,
	unstable_parseMultipartFormData as parseMultipartFormData,
} from '@remix-run/node'
import { Link, type MetaFunction, useLoaderData } from '@remix-run/react'

import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { useIsUserAdmin } from '#app/utils/user.ts'
import { ImportInventoryFromFileModal } from '../../components/inventory/inventory-import.tsx'
import { InventoryProductsTable } from '../../components/inventory/inventory-products-table.tsx'
import { InventoryStats } from '../../components/inventory/inventory-stats.tsx'
import { InventoryProvider } from '../../context/inventory/InventoryContext.tsx'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import {
	getInventoryValueByCategory,
	getLowStockProducts,
} from '#app/services/inventory/inventory-analysis.server.ts'
import { createProductsFromImport } from '#app/services/inventory/inventory-import.server.ts'
import {
	getBestSellingProduct,
	getMostProfitProduct,
} from '#app/services/inventory/product-analytics.server.ts'
import {
	getProducts,
	getTotalProducts,
	inventoryHasActiveProducts,
} from '#app/services/inventory/product-queries.server.ts'
import { parseInventoryUrlParams } from '#app/utils/inventory/inventory-params.ts'

export const LOW_STOCK_CHANGE_FOR_CONFIG = '5'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const { pagination, filters, sortConfig } = parseInventoryUrlParams(
		request.url,
	)

	const allCategoriesPromise = prisma.category.findMany({
		where: { businessId },
		select: { id: true, name: true },
	})

	const [
		products,
		totalProducts,
		inventoryValue,
		stockData,
		bestSeller,
		mostProfit,
		allCategories,
		hasActiveProducts,
	] = await Promise.all([
		getProducts({
			businessId,
			filters,
			pagination,
			sortConfig,
		}),
		getTotalProducts({
			businessId,
			filters,
		}),
		getInventoryValueByCategory(businessId),
		getLowStockProducts(
			businessId,
			Number.parseInt(LOW_STOCK_CHANGE_FOR_CONFIG),
		),
		getBestSellingProduct(businessId),
		getMostProfitProduct(businessId),
		allCategoriesPromise,
		inventoryHasActiveProducts(businessId),
	])

	return json({
		products,
		totalProducts,
		inventoryValue,
		stockData,
		bestSeller,
		mostProfit,
		allCategories,
		hasActiveProducts: hasActiveProducts !== null,
	})
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const formData = await parseMultipartFormData(
		request,
		createMemoryUploadHandler(),
	)
	//Add switch cases for eventual different actions
	return await createProductsFromImport({ formData, businessId })
}

export default function InventoryRoute() {
	const isAdmin = useIsUserAdmin()
	const loaderData = useLoaderData<typeof loader>()

	return (
		<InventoryProvider data={loaderData}>
			<ContentLayout
				title="Administración de Inventario"
				limitHeight
				actions={isAdmin && <InventoryOptions />}
			>
				<main className="flex h-full  flex-col gap-4">
					<div className="flex w-full flex-1 flex-col gap-4  xl:h-[48rem] xl:flex-row">
						<div className="flex h-full w-full flex-1 flex-col-reverse gap-4  xl:flex-row-reverse ">
							<InventoryStats />
							<InventoryProductsTable />
						</div>
					</div>
				</main>
			</ContentLayout>
		</InventoryProvider>
	)
}

function InventoryOptions() {
	return (
		<div className="mt-4 flex w-full flex-col justify-between gap-4  md:flex-row-reverse lg:mt-0">
			<div className="flex w-full gap-1 ">
				<CreateItemDialog />
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size={'sm'} className="h-7 w-6 gap-1 p-0 text-sm">
							<Icon name="dots-vertical" />
							<span className="sr-only">
								Mas opciones para ingresar productos
							</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem asChild>
							<Link to={'new-products'}>
								<Icon name="cube-plus" className="mr-2" /> Ingresar multiples
								productos
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={(e) => e.preventDefault()}>
							<ImportInventoryFromFileModal />
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<ModifyProductPriceInBulkModal />
			<Button
				asChild
				size={'sm'}
				className="h-7 gap-1 text-sm"
				variant={'outline'}
			>
				<a href={'/resources/inventory/template-generator'}>
					<Icon name="file-arrow-right" size="sm" className="mr-2" />
					<span>Exportar datos de inventario</span>
				</a>
			</Button>
		</div>
	)
}

export const meta: MetaFunction = () => {
	return [{ title: `Inventario | Ventesca` }]
}
