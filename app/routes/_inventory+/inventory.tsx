import {
	getBusinessId,
	getDefaultCategory,
	getDefaultSupplier,
	requireUserId,
} from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'

import { ContentLayout } from '#app/components/layout/content-layout.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { FILTER_PARAMS } from '#app/constants/filterParams.ts'
import { SortDirection } from '#app/types/SortDirection.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { userIsAdmin } from '#app/utils/user.ts'
import { parseWithZod } from '@conform-to/zod'
import { Prisma, Product } from '@prisma/client'
import {
	ActionFunctionArgs,
	unstable_createMemoryUploadHandler as createMemoryUploadHandler,
	json,
	unstable_parseMultipartFormData as parseMultipartFormData,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { MetaFunction, useLoaderData } from '@remix-run/react'
import { z } from 'zod'
import {
	ImportInventoryFromFileModal,
	ImportInventoryFromFileSchema,
} from '../../components/inventory/inventory-import.tsx'
import { InventoryProductsTable } from '../../components/inventory/inventory-products-table.tsx'
import { InventoryStats } from '../../components/inventory/inventory-stats.tsx'
import { InventoryProvider } from '../../context/inventory/InventoryContext.tsx'
import {
	ParsedProduct,
	parseExcelTemplate,
	validateParsedProduct,
	validateTemplate,
} from './inventory.generate-inventory-template'
import {
	getBestSellingProduct,
	getInventoryValueByCategory,
	getLowStockProducts,
	getMostProfitProduct,
} from './product-service.server.ts'

import { ModifyProductPriceInBulkModal } from '#app/components/inventory/inventory-bulk-price-modify-modal.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Link } from '@remix-run/react'
import { CreateItemDialog } from '#app/components/inventory/product-create-single.tsx'

export const LOW_STOCK_CHANGE_FOR_CONFIG = '5'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const url = new URL(request.url)
	const $top = Number(url.searchParams.get('$top')) || 25
	const $skip = Number(url.searchParams.get('$skip')) || 0
	const searchTerm = url.searchParams.get('search') ?? ''

	const stockFilter = url.searchParams.get(FILTER_PARAMS.STOCK)
	const categoryFilter = url.searchParams.get(FILTER_PARAMS.CATEGORY)
	const statusFilter = url.searchParams.get(FILTER_PARAMS.STATUS)
	const sortBy = url.searchParams.get(FILTER_PARAMS.SORT_BY)
	const sortDirection = url.searchParams.get(FILTER_PARAMS.SORT_DIRECTION)

	const sortOptions: Record<string, Prisma.ProductOrderByWithRelationInput> = {
		default: { name: 'asc' },
		name: { name: sortDirection === SortDirection.ASC ? 'asc' : 'desc' },
		'selling-price': {
			sellingPrice: sortDirection === SortDirection.ASC ? 'asc' : 'desc',
		},
		stock: { stock: sortDirection === SortDirection.ASC ? 'asc' : 'desc' },
		code: {
			code: sortDirection === SortDirection.ASC ? 'asc' : 'desc',
		},
	}

	const searchTermIsCode = !isNaN(parseInt(searchTerm))
	const productSelect: Prisma.ProductSelect = {
		id: true,
		code: true,
		name: true,
		sellingPrice: true,
		stock: true,
		isActive: true,
		category: { select: { id: true, description: true } },
	}

	const filters: Prisma.ProductWhereInput = {
		businessId,
		isDeleted: false,
		...(stockFilter && {
			stock: { lte: Number.parseInt(stockFilter) },
		}),
		...(categoryFilter && { categoryId: categoryFilter }),
		...(searchTermIsCode
			? { code: searchTerm }
			: { name: { contains: searchTerm } }),
		...(statusFilter && { isActive: statusFilter === 'active' }),
	}

	const productsPromise = prisma.product.findMany({
		where: filters,
		select: productSelect,
		orderBy:
			sortBy && sortOptions[sortBy]
				? sortOptions[sortBy]
				: sortOptions['default'],
		take: $top,
		skip: $skip,
	})

	const totalProductsPromise = prisma.product.count({ where: filters })

	const inventoryValuePromise = getInventoryValueByCategory(businessId)
	const stockDataPromise = getLowStockProducts(
		businessId,
		Number.parseInt(LOW_STOCK_CHANGE_FOR_CONFIG),
	)
	const bestSellerPromise = getBestSellingProduct(businessId)
	const mostProfitPromise = getMostProfitProduct(businessId)
	const allCategoriesPromise = prisma.category.findMany({
		where: { businessId },
		select: { id: true, description: true },
	})
	const hasActiveProductsPromise = prisma.product.findFirst({
		where: { businessId, isActive: true },
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
		productsPromise,
		totalProductsPromise,
		inventoryValuePromise,
		stockDataPromise,
		bestSellerPromise,
		mostProfitPromise,
		allCategoriesPromise,
		hasActiveProductsPromise,
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

	const submission = await parseWithZod(formData, {
		schema: ImportInventoryFromFileSchema.superRefine(async (data, ctx) => {
			const buffer = Buffer.from(await data.template.arrayBuffer())
			const isValidTemplate = validateTemplate(buffer)

			if (!isValidTemplate) {
				ctx.addIssue({
					path: ['template'],
					code: z.ZodIssueCode.custom,
					message: 'La plantilla cargada no es válida.',
				})
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{
				result: submission.reply(),
				productsWithErrors: null,
				productsWithWarnings: null,
				successfulProducts: null,
			},
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { template } = submission.value

	const arrayBuffer = await template.arrayBuffer()
	const buffer = Buffer.from(arrayBuffer)

	const productsReceived = parseExcelTemplate(buffer)
	console.table(productsReceived)
	const businessCategories = await prisma.category.findMany({
		where: { businessId },
		select: { id: true, code: true },
	})
	const businessSuppliers = await prisma.supplier.findMany({
		where: { businessId },
		select: { id: true, code: true },
	})
	const fallbackCategory = await getDefaultCategory({ businessId })
	const fallbackSupplier = await getDefaultSupplier({
		businessId,
		email: '',
		name: '',
	})

	const existingProductCodesOnly = await prisma.product.findMany({
		where: { businessId, code: { in: productsReceived.map(p => p.code) } },
		select: { code: true },
	})
	const existingCodes = new Set(existingProductCodesOnly.map(p => p.code))

	const productsToCreate: Pick<
		Product,
		| 'code'
		| 'name'
		| 'businessId'
		| 'categoryId'
		| 'supplierId'
		| 'cost'
		| 'sellingPrice'
		| 'stock'
		| 'isActive'
	>[] = []
	const productsWithErrors: Array<{
		parsedProduct: ParsedProduct
		message: string
	}> = []
	const productsWithWarnings: Array<{
		parsedProduct: ParsedProduct
		message: string
	}> = []
	const successfulProducts: Array<ParsedProduct> = []
	for (const parsedProduct of productsReceived) {
		if (existingCodes.has(parsedProduct.code)) {
			productsWithErrors.push({
				parsedProduct,
				message: 'Código se encuentra registrado en inventario.',
			})
			continue
		}
		if (new Set(productsToCreate.map(p => p.code)).has(parsedProduct.code)) {
			productsWithErrors.push({
				parsedProduct,
				message: 'Código se encuentra duplicado en plantilla.',
			})
			continue
		}

		const validationResult = await validateParsedProduct({
			parsedProduct,
			businessCategories,
			businessSuppliers,
			fallbackCategory,
			fallbackSupplier,
		})

		if (!validationResult.isValidProductName) {
			productsWithErrors.push({
				parsedProduct,
				message: validationResult.errorMessage,
			})
			continue
		}

		productsToCreate.push({
			code: parsedProduct.code,
			name: parsedProduct.name,
			cost: validationResult.cost,
			sellingPrice: validationResult.sellingPrice,
			stock: validationResult.stock,
			businessId,
			categoryId: validationResult.categoryId,
			supplierId: validationResult.supplierId,
			isActive:
				validationResult.cost > 0 &&
				validationResult.sellingPrice > 0 &&
				validationResult.stock > 0,
		})

		if (validationResult.errorMessage) {
			productsWithWarnings.push({
				parsedProduct,
				message: validationResult.errorMessage,
			})
		} else {
			successfulProducts.push(parsedProduct)
		}
	}

	await prisma.$transaction(async tx => {
		const products = await tx.product.createManyAndReturn({
			data: productsToCreate,
			select: { id: true },
		})

		await tx.productAnalytics.createMany({
			data: products.map(product => ({
				productId: product.id,
				businessId,
				//TODO:CONNECT TO BUSINESS!!!!
			})),
		})
	})

	return json({
		result: submission.reply(),
		productsWithErrors,
		productsWithWarnings,
		successfulProducts,
	})
}

export default function InventoryRoute() {
	const isAdmin = userIsAdmin()
	const loaderData = useLoaderData<typeof loader>()

	return (
		<InventoryProvider data={loaderData}>
			<ContentLayout
				title="Administración de Inventario"
				limitHeight
				actions={isAdmin && <InventoryOptions />}
			>
				<main className="flex h-full  flex-col gap-4">
					{/* <InventoryHeader isAdmin={isAdmin} /> */}
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
						<DropdownMenuItem onSelect={e => e.preventDefault()}>
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
				<a href={'/inventory/generate-inventory-template'}>
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
