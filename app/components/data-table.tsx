import { useNavigate } from '@remix-run/react'
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type ColumnFiltersState,
	type SortingState,
	type Table as TsTable,
} from '@tanstack/react-table'
import { useState } from 'react'
import { SearchBar } from '#app/components/search-bar.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Skeleton } from '#app/components/ui/skeleton.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	withItemSearch: boolean
	searchFilter: {
		key: string
		description: string
	}
}

export function DataTable<TData, TValue>({
	columns,
	data,
	withItemSearch = true,
	searchFilter,
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = useState<SortingState>([])

	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

	const navigate = useNavigate()

	function goToRowDetails(itemId: string) {
		navigate(itemId)
	}

	const table = useReactTable({
		data,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		state: {
			sorting,
			columnFilters,
		},
	})

	return (
		<div>
			<div className="flex items-center justify-between py-4">
				{withItemSearch ? (
					<SearchBar
						onFocus={() => {
							table.getColumn('name')?.setFilterValue('')
						}}
						status="idle"
						autoFocus
						autoSubmit
					/>
				) : null}

				<Input
					placeholder={`Filtrar por ${searchFilter.description}`}
					value={
						(table.getColumn(searchFilter.key)?.getFilterValue() as string) ??
						''
					}
					onChange={event =>
						table
							.getColumn(searchFilter.key)
							?.setFilterValue(event.target.value)
					}
					className="max-w-[22.5rem]"
				/>
			</div>
			<div className="rounded-md border">
				<Table>
					<TableHeader className="border-b-2 border-background/80 bg-secondary">
						{table.getHeaderGroups().map(headerGroup => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map(header => {
									return (
										<TableHead className="p-1" key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
												  )}
										</TableHead>
									)
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map(row => (
								<TableRow
									key={row.id}
									className="cursor-pointer"
									onClick={() =>
										goToRowDetails((row.original as { id: string }).id)
									}
								>
									{row.getVisibleCells().map(cell => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									Ningún resultado.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="flex items-center justify-end space-x-2 py-4">
				<DataTablePagination table={table} />
			</div>
		</div>
	)
}

interface DataTablePaginationProps<TData> {
	table: TsTable<TData>
}

export function DataTablePagination<TData>({
	table,
}: DataTablePaginationProps<TData>) {
	return (
		<div className="absolute bottom-5 right-8 flex items-center justify-between rounded-md bg-secondary/50 backdrop-blur-sm p-2">
			<div className="flex items-center space-x-6 lg:space-x-8">
				<div className="flex w-[150px] items-center justify-center text-sm font-medium">
					Página {table.getState().pagination.pageIndex + 1} de{' '}
					{table.getPageCount()}
				</div>
				<div className="flex items-center space-x-2">
					<Button
						variant="outline"
						className="hidden h-8 w-8 p-0 lg:flex"
						onClick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
					>
						<span className="sr-only">Ir a la primera página</span>
						<Icon name="double-arrow-left" className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<span className="sr-only">Ir a la página anterior</span>
						<Icon name="chevron-left" className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						className="h-8 w-8 p-0"
						onClick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						<span className="sr-only">Ir a la siguiente página</span>
						<Icon name="chevron-right" className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						className="hidden h-8 w-8 p-0 lg:flex"
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}
					>
						<span className="sr-only">Ir a la última página</span>
						<Icon name="double-arrow-right" className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	)
}

export function DataTableSkeleton({ rows = 10 }: { rows?: number }) {
	function RowSkeleton() {
		return (
			<div className="flex gap-1">
				<Skeleton className="h-12 w-[35rem]" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
		)
	}

	const generateRows = (count: number) =>
		Array.from({ length: count }, (_, index) => <RowSkeleton key={index} />)
	return (
		<div className="relative mt-16 flex flex-col gap-2">
			<Skeleton className="h-12 w-full rounded-md" />
			{generateRows(rows)}
		</div>
	)
}
