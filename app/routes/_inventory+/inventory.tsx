import { PaginationBar } from '#app/components/pagination-bar.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { DataCard } from '#app/components/ui/data-card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency, useDebounce, useIsPending } from '#app/utils/misc.tsx'
import { Label } from '@radix-ui/react-label'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import {
	Form,
	useLoaderData,
	useNavigate,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import { useId } from 'react'
import { CreateItemDialog } from './inventory_.new.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const url = new URL(request.url)
	const $top = Number(url.searchParams.get('$top')) || 50
	const $skip = Number(url.searchParams.get('$skip')) || 0
	const searchTerm = url.searchParams.get('search') ?? ''

	const searchTermIsCode = !isNaN(parseInt(searchTerm))
	const productSelect = {
		id: true,
		code: true,
		name: true,
		sellingPrice: true,
		stock: true,
		category: { select: { description: true } },
	}

	let productsPromise
	let totalProductsPromise

	if (searchTermIsCode) {
		const where = {
			businessId,
			code: searchTerm,
		}

		productsPromise = prisma.product.findMany({
			orderBy: { code: 'asc' },
			select: { ...productSelect },

			where: {
				businessId,
				code: searchTerm,
			},
		})

		totalProductsPromise = prisma.product.count({ where })
	} else {
		const where = {
			businessId,
			name: { contains: searchTerm },
		}

		productsPromise = prisma.product.findMany({
			take: $top,
			skip: $skip,
			orderBy: { code: 'asc' },
			select: { ...productSelect },
			where: {
				businessId,
				name: { contains: searchTerm },
			},
		})

		totalProductsPromise = prisma.product.count({ where })
	}

	const totalActiveProductsPromise = prisma.product.count({
		where: {
			businessId,
			isActive: true,
		},
	})

	const noStockProductsPromise = prisma.product.count({
		where: {
			businessId,
			stock: 0,
		},
	})

	const lowStockProductsPromise = prisma.product.count({
		where: {
			businessId,
			stock: { lte: 5, gt: 0 },
		},
	})

	const [
		products,
		totalActiveProducts,
		totalProducts,
		noStockProducts,
		lowStockProducts,
	] = await Promise.all([
		productsPromise,
		totalActiveProductsPromise,
		totalProductsPromise,
		noStockProductsPromise,
		lowStockProductsPromise,
	])

	return json({
		products,
		totalActiveProducts,
		totalProducts,
		noStockProducts,
		lowStockProducts,
	})
}

export default function InventoryRoute() {
	const isAdmin = true
	const {
		products,
		totalActiveProducts,
		totalProducts,
		noStockProducts,
		lowStockProducts,
	} = useLoaderData<typeof loader>()

	return (
		<main className="flex h-full  flex-col">
			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
				<h1 className="text-xl font-semibold">Administración de Inventario</h1>
				{isAdmin && <CreateItemDialog />}
			</div>
			<Spacer size={'4xs'} />

			<div className="grid h-[85dvh]  items-start gap-4 lg:grid-cols-3 ">
				<div className="flex h-full flex-1 flex-col gap-4 overflow-hidden lg:col-span-3">
					{/* Fix layout on small devices */}
					<div className="flex flex-wrap justify-between gap-4">
						<DataCard
							title={'Artículos Disponibles'}
							value={`${totalActiveProducts}`}
							icon={'package'}
							subtext={`${totalProducts} ${
								totalProducts === 1
									? 'artículo registrados en sistema'
									: 'artículos registrados en sistema'
							} `}
						/>
						<DataCard
							title={'Artículos Sin Stock'}
							value={`${noStockProducts}`}
							icon={'box-off'}
							subtext={`${lowStockProducts} artículos próximos a agotarse`}
						/>
						<DataCard
							title={'Mayores Ingresos'}
							value={`${formatCurrency(102000)}`}
							icon={'trending-up'}
							subtext={'Zapatilla Nike 24 White'}
						/>
						<DataCard
							title={'Menores Ingresos'}
							value={`${formatCurrency(2000)}`}
							icon={'trending-down'}
							subtext={'Caja negra sin sentido'}
						/>
					</div>

					<ProductsTableCard
						totalProducts={totalProducts}
						products={products}
					/>
				</div>
			</div>
		</main>
	)
}

type ProductData = {
	name: string | null
	code: string
	id: string
	sellingPrice: number | null
	stock: number
	category: {
		description: string
	}
}
function ProductsTableCard({
	products,
	totalProducts,
}: {
	products: ProductData[]
	totalProducts: number
}) {
	const navigate = useNavigate()

	return (
		<Card className="no-scrollbar relative  h-full flex-grow overflow-y-auto">
			<CardHeader className="sticky top-0 z-10 flex flex-col items-center justify-between gap-4 bg-card px-7 text-center lg:flex-row lg:items-start lg:text-start">
				<div className="grid gap-2">
					<CardTitle>Artículos</CardTitle>
					<CardDescription>
						Mostrando {products.length} de {totalProducts} artículos
						registrados.
					</CardDescription>
				</div>
				<PaginationBar total={totalProducts} top={50} />
				<InventorySearchBar status="idle" autoSubmit />
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader className="sticky top-[6.1rem] rounded-t-sm bg-secondary">
						<TableRow>
							<TableHead>Descripción / Código</TableHead>
							<TableHead className="hidden lg:table-cell">Categoría</TableHead>
							<TableHead className="hidden md:table-cell">Stock</TableHead>
							<TableHead className="text-right">Precio Venta</TableHead>
						</TableRow>
					</TableHeader>

					<TableBody>
						{products.map(item => (
							<TableRow
								key={item.id}
								className="cursor-pointer"
								onClick={() => navigate(item.id)}
							>
								<TableCell>
									<div className="font-medium uppercase">{item.name}</div>
									<div className="text-xs uppercase text-muted-foreground">
										{item.code}
									</div>
								</TableCell>
								<TableCell className="hidden lg:table-cell">
									<Badge className="text-xs uppercase" variant="outline">
										{item.category.description}
									</Badge>
								</TableCell>
								<TableCell className="hidden md:table-cell">
									{item.stock}
								</TableCell>
								<TableCell className="text-right">
									{formatCurrency(item.sellingPrice)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
			<CardFooter></CardFooter>
		</Card>
	)
}

function InventorySearchBar({
	status,
	autoFocus = false,
	autoSubmit = false,
}: {
	status: 'idle' | 'pending' | 'success' | 'error'

	autoFocus?: boolean
	autoSubmit?: boolean
}) {
	const id = useId()
	const [searchParams] = useSearchParams()
	const submit = useSubmit()
	const isSubmitting = useIsPending({
		formMethod: 'GET',
		formAction: '/inventory',
	})

	const handleFormChange = useDebounce((form: HTMLFormElement) => {
		submit(form)
	}, 400)

	return (
		<Form
			method="GET"
			action="/inventory"
			className="flex flex-wrap items-center justify-center gap-1"
			onChange={e => autoSubmit && handleFormChange(e.currentTarget)}
		>
			<div className="flex-1">
				<Label htmlFor={id} className="sr-only">
					Buscar
				</Label>
				<Input
					type="text"
					name="search"
					id={id}
					defaultValue={searchParams.get('search') ?? ''}
					placeholder="Búsqueda"
					className=" [&::-webkit-inner-spin-button]:appearance-none"
					autoFocus={autoFocus}
				/>
			</div>
			<div>
				<StatusButton
					type="submit"
					status={isSubmitting ? 'pending' : status}
					className="flex w-full items-center justify-center"
					size="sm"
				>
					<Icon name="magnifying-glass" size="md" />
					<span className="sr-only">Buscar</span>
				</StatusButton>
			</div>
		</Form>
	)
}
