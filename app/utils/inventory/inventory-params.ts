import { SortDirection } from "#app/types/SortDirection.ts"
import { Prisma } from "@prisma/client"
import { FILTER_PARAMS } from "../params"

export type ProductFilters = {
	searchTerm?: string | null
	stockFilter?: string | null
	categoryFilter?: string | null
	supplierFilter?: string | null
	statusFilter?: string | null
}

export type PaginationOptions = {
	$top: number
	$skip: number
}

export type SortConfig = {
	sortBy: string
	sortDirection?: SortDirection
}
export function parseInventoryUrlParams(url: string) {
	const urlObj = new URL(url)

	const pagination: PaginationOptions = {
		$top: Number(urlObj.searchParams.get('$top')) || 25,
		$skip: Number(urlObj.searchParams.get('$skip')) || 0,
	}

	const filters: ProductFilters = {
		searchTerm: urlObj.searchParams.get('search') ?? '',
		stockFilter: urlObj.searchParams.get(FILTER_PARAMS.STOCK),
		categoryFilter: urlObj.searchParams.get(FILTER_PARAMS.CATEGORY),
		supplierFilter: urlObj.searchParams.get(FILTER_PARAMS.SUPPLIER),
		statusFilter: urlObj.searchParams.get(FILTER_PARAMS.STATUS),
	}

	const sortConfig: SortConfig = {
		sortBy: urlObj.searchParams.get(FILTER_PARAMS.SORT_BY) ?? 'name',
		sortDirection:
			(urlObj.searchParams.get(
				FILTER_PARAMS.SORT_DIRECTION,
			) as SortDirection) ?? SortDirection.ASC,
	}

	const sortOptions: Record<string, Prisma.ProductOrderByWithRelationInput> = {
		name: {
			name: sortConfig.sortDirection,
		},
		'selling-price': {
			sellingPrice: sortConfig.sortDirection,
		},
		stock: {
			stock: sortConfig.sortDirection,
		},
		code: {
			code: sortConfig.sortDirection,
		},
	}

	return {
		pagination,
		filters,
		sortConfig: sortOptions[sortConfig.sortBy] || {
			name: sortConfig.sortDirection,
		},
	}
}