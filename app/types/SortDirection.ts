import { z } from 'zod'

export enum SortDirection {
	ASC = 'asc',
	DESC = 'desc',
}

export const allSortDirections = [
	SortDirection.ASC,
	SortDirection.DESC,
] as const

export const SortDirectionSchema = z.enum(allSortDirections)
