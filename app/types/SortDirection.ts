import { z } from 'zod'

export const SortDirection = {
	ASC: 'ASC',
	DESC: 'DESC',
} as const

export type SortDirection =
	keyof typeof SortDirection

export const allSortDirections = Object.values(
	SortDirection,
) as [SortDirection, ...SortDirection[]]

export const SortDirectionSchema = z.enum(
	allSortDirections,
)
