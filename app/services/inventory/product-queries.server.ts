import { prisma } from '#app/utils/db.server.ts'
import {
	PaginationOptions,
	ProductFilters,
} from '#app/utils/inventory/inventory-params.ts'
import { type Prisma } from '@prisma/client'

const PRODUCT_SELECT = {
	id: true,
	code: true,
	name: true,
	sellingPrice: true,
	stock: true,
	isActive: true,
	category: { select: { id: true, name: true } },
} as const

export function getProducts({
	businessId,
	filters,
	pagination,
	sortConfig,
}: {
	businessId: string
	filters: ProductFilters
	pagination: PaginationOptions
	sortConfig: Prisma.ProductOrderByWithRelationInput
}) {
	const { searchTerm, stockFilter, categoryFilter, statusFilter } = filters
	const { $top, $skip } = pagination

	const searchTermIsCode = searchTerm && !isNaN(parseInt(searchTerm))
	const whereClause = {
		businessId,
		isDeleted: false,
		...(stockFilter && { stock: { lte: Number.parseInt(stockFilter) } }),
		...(categoryFilter && { categoryId: categoryFilter }),
		...(searchTerm &&
			(searchTermIsCode
				? { code: searchTerm }
				: { name: { contains: searchTerm } })),
		...(statusFilter && { isActive: statusFilter === 'active' }),
	}

	const orderBy = sortConfig

	return prisma.product.findMany({
		where: whereClause,
		select: PRODUCT_SELECT,
		orderBy,
		take: $top,
		skip: $skip,
	})
}

export function getTotalProducts({
	businessId,
	filters,
}: {
	businessId: string
	filters: ProductFilters
}) {
	const { searchTerm, stockFilter, categoryFilter, statusFilter } = filters

	const searchTermIsCode = searchTerm && !isNaN(parseInt(searchTerm))
	const whereClause = {
		businessId,
		isDeleted: false,
		...(stockFilter && { stock: { lte: Number.parseInt(stockFilter) } }),
		...(categoryFilter && { categoryId: categoryFilter }),
		...(searchTerm &&
			(searchTermIsCode
				? { code: searchTerm }
				: { name: { contains: searchTerm } })),
		...(statusFilter && { isActive: statusFilter === 'active' }),
	}

	return prisma.product.count({
		where: whereClause,
	})
}

export function inventoryHasActiveProducts(businessId: string) {
	return prisma.product
		.findFirst({
			where: { businessId, isActive: true },
		})
		.then((product) => product !== null)
}
