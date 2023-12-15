import { SearchBar } from '#app/components/search-bar.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, NavLink, useLoaderData, useNavigate } from '@remix-run/react'

import { formatCurrency } from '#app/utils/misc.tsx'

const PER_PAGE = 10

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const searchTerm = new URL(request.url).searchParams.get('search')
	const orderByParam = url.searchParams.get('orderBy')
	const orderBy = orderByParam ? orderByParam.toString() : 'code'
	const orderParam = url.searchParams.get('order')
	const order = orderParam ? orderParam.toString() : 'asc'

	if (searchTerm === '') {
		return redirect('/system/inventory')
	}
	const pageParam = url.searchParams.get('page')

	const page = pageParam ? parseInt(pageParam.toString()) : 0

	const items = await prisma.item.findMany({
		take: PER_PAGE,

		skip: PER_PAGE * page,
		orderBy: { [orderBy]: order },
		select: {
			id: true,
			code: true,
			name: true,
			stock: true,
			price: true,
			family: { select: { description: true } },
		},
		where: {
			code: searchTerm ? parseInt(searchTerm.toString()) : undefined,
		},
	})
	

	const nextPage = page + 1
	const prevPage = page > 0 ? page - 1 : 0
	const totalPages = Math.floor(itemsCount / PER_PAGE)

	const formattedItems = items.map(item => {
		return {
			...item,
			price: formatCurrency(item.price),
		}
	})

	return json({
		items: formattedItems,
		pagination: {
			nextPage,
			prevPage,
			totalPages,
			currentPage: page,
		},
	})
}

type PaginationData = {
	nextPage: number
	prevPage: number
	totalPages: number
	currentPage: number
}

export default function InventoryRoute() {
	const { items, pagination } = useLoaderData<typeof loader>()
	const navigate = useNavigate()

	function goToItemDetail(itemId: string) {
		navigate(itemId)
	}

	return (
		<>
			<h1 className="text-2xl">Administración de Inventario</h1>
			<div className="mt-4 w-[15rem]">
				<SearchBar status="idle" autoFocus autoSubmit />

				<Button asChild variant={'outline'}>
					<NavLink
						className="flex items-center gap-2"
						to={'?orderBy=stock&order=asc'}
					>
						<span>Ordenar por stock ASC</span> <Icon name="arrow-up" />
					</NavLink>
				</Button>
			</div>

			<Table className="mt-4 overflow-clip rounded-md">
				<TableHeader className="border-b-2 border-background/80 bg-secondary">
					<TableRow>
						<TableHead className="w-[100px] ">Código</TableHead>
						<TableHead>Nombre / Descripción</TableHead>
						<TableHead>Categoría</TableHead>
						<TableHead>Stock</TableHead>
						<TableHead className="text-right">Precio</TableHead>
					</TableRow>
				</TableHeader>

				<TableBody>
					{items.map(item => (
						<TableRow
							className="cursor-pointer"
							onClick={() => goToItemDetail(item.id)}
							key={item.id}
						>
							<TableCell className="bg-secondary font-bold">
								{item.code}
							</TableCell>
							<TableCell className="font-semibold tracking-wider text-foreground">
								{item.name}
							</TableCell>
							<TableCell className="text-foreground/50">
								{item.family?.description}
							</TableCell>
							<TableCell className="">{item.stock}</TableCell>
							<TableCell className="text-right">{item.price}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<PaginationControls paginationData={pagination} />
		</>
	)
}

export function SortingControls() {
	return <div>Sorting</div>
}

export function PaginationControls({
	paginationData,
}: {
	paginationData: PaginationData
}) {
	return (
		// <div className="ml-auto mt-1 flex w-fit items-center justify-end gap-2 rounded-sm bg-secondary px-4 py-1">
		<div className="absolute bottom-5 right-10 ml-auto mt-1 flex w-fit select-none items-center justify-end gap-2 rounded-sm bg-secondary/50 px-4 py-1 backdrop-blur-md">
			<p className="mr-20 text-sm text-foreground/90">
				Página {paginationData.currentPage} de {paginationData.totalPages}
			</p>

			<Button
				className="h-10 w-10 p-0"
				variant={'outline'}
				size={'icon'}
				asChild
			>
				<Link prefetch="intent" to={`?page=0`} preventScrollReset>
					<Icon name="double-arrow-left" size="lg" />
				</Link>
			</Button>
			<Button
				className="h-10 w-10 p-0"
				variant={'outline'}
				size={'icon'}
				asChild
			>
				<Link
					prefetch="intent"
					to={`?page=${paginationData.prevPage}`}
					preventScrollReset
				>
					<Icon name="chevron-left" size="lg" />
				</Link>
			</Button>
			<Button
				className="h-10 w-10 p-0"
				variant={'outline'}
				size={'icon'}
				asChild
			>
				<Link
					prefetch="intent"
					to={`?page=${paginationData.nextPage}`}
					preventScrollReset
				>
					<Icon name="chevron-right" size="lg" />
				</Link>
			</Button>
			<Button
				className="h-10 w-10 p-0"
				variant={'outline'}
				size={'icon'}
				asChild
			>
				<Link
					prefetch="intent"
					to={`?page=${paginationData.totalPages}`}
					preventScrollReset
				>
					<Icon name="double-arrow-right" size="lg" />
				</Link>
			</Button>
		</div>
	)
}
