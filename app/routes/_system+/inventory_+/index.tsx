import { PaginationBar } from '#app/components/pagination-bar.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon, IconName } from '#app/components/ui/icon.tsx'
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
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency, useDebounce, useIsPending } from '#app/utils/misc.tsx'
import { Label } from '@radix-ui/react-label'
import { defer, type LoaderFunctionArgs } from '@remix-run/node'
import {
	Await,
	Form,
	Link,
	useLoaderData,
	useNavigate,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import { Suspense, useId } from 'react'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)
	const url = new URL(request.url)
	const $top = Number(url.searchParams.get('$top')) || 5
	const $skip = Number(url.searchParams.get('$skip')) || 0
	const searchTerm = url.searchParams.get('search') ?? ''

	const searchTermIsCode = !isNaN(parseInt(searchTerm))

	let itemsPromise

	if (searchTermIsCode) {
		itemsPromise = prisma.item
			.findMany({
				orderBy: { code: 'asc' },
				select: {
					id: true,
					code: true,
					name: true,
					sellingPrice: true,
					stock: true,
					family: { select: { description: true } },
				},
				where: {
					code: parseInt(searchTerm),
				},
			})
			.then(u => u)
	} else {
		itemsPromise = prisma.item
			.findMany({
				take: $top,
				skip: $skip,
				orderBy: { code: 'asc' },
				select: {
					id: true,
					code: true,
					name: true,
					sellingPrice: true,
					stock: true,
					family: { select: { description: true } },
				},
				where: {
					name: { contains: searchTerm },
				},
			})
			.then(u => u)
	}

	const totalItemsPromise = prisma.item.count()

	const noStockItemsPromise = prisma.item.count({
		where: {
			stock: 0,
		},
	})

	const lowStockItemsPromise = prisma.item.count({
		where: {
			stock: { lte: 5, gt: 0 },
		},
	})

	const newItemsThisMonthPromise = prisma.item.count({
		where: {
			createdAt: {
				gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
			},
		},
	})

	const [totalItems, noStockItems, lowStockItems, newItemsThisMonth] =
		await Promise.all([
			totalItemsPromise,
			noStockItemsPromise,
			lowStockItemsPromise,
			newItemsThisMonthPromise,
		])

	return defer({
		itemsPromise,
		totalItems,
		noStockItems,
		lowStockItems,
		newItemsThisMonth,
	})
}

export default function InventoryRoute() {
	const isAdmin = true
	const {
		itemsPromise,
		totalItems,
		noStockItems,
		lowStockItems,
		newItemsThisMonth,
	} = useLoaderData<typeof loader>()

	return (
		<main className="flex flex-col">
			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
				<h1 className="text-xl font-semibold">Administración de Inventario</h1>
				{isAdmin && (
					<Button asChild variant={'outline'}>
						<Link className="flex items-center justify-center gap-2" to="new">
							<Icon name="plus" size="md" />
							<span>Agregar articulo</span>
						</Link>
					</Button>
				)}
			</div>
			<Spacer size={'4xs'} />
			<div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
				<DataCard
					title={'Artículos Registrados'}
					value={`${totalItems}`}
					icon={'package'}
					subtext={`${newItemsThisMonth} ${
						newItemsThisMonth === 1 ? 'articulo' : 'artículos'
					} nuevos este mes`}
				/>
				<DataCard
					title={'Artículos Sin Stock'}
					value={`${noStockItems}`}
					icon={'box-off'}
					subtext={`${lowStockItems} artículos próximos a agotarse`}
				/>
				<DataCard
					title={'Mayores Ingresos'}
					value={`${formatCurrency(102000)} CLP`}
					icon={'trending-up'}
					subtext={'Zapatilla Nike 24 White'}
				/>
				<DataCard
					title={'Menores Ingresos'}
					value={`${formatCurrency(2000)} CLP`}
					icon={'trending-down'}
					subtext={'Caja negra sin sentido'}
				/>
			</div>
			<Spacer size={'4xs'} />

			<Suspense
				fallback={
					<LoadingSpinner description={`Cargando ${totalItems} artículos...`} />
				}
			>
				<Await resolve={itemsPromise}>
					{items => <ItemsTableCard totalItems={totalItems} items={items} />}
				</Await>
			</Suspense>
		</main>
	)
}

function DataCard({
	title,
	value,
	icon,
	subtext,
}: {
	title: string
	value: string
	icon: IconName
	subtext: string
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				<Icon className="text-xl text-foreground/80" name={icon} />
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				<p className="text-xs text-muted-foreground">{subtext}</p>
			</CardContent>
		</Card>
	)
}

type ItemData = {
	name: string | null
	code: number
	id: string
	sellingPrice: number | null
	stock: number
	family: {
		description: string
	} | null
}
function ItemsTableCard({ items, totalItems }: { items: ItemData[], totalItems: number}) {
	const navigate = useNavigate()

	return (
		<Card className=" max-h-[63dvh]  xl:col-span-2">
			<CardHeader className="flex flex-col items-center text-center md:flex-row md:justify-between md:text-left">
				<div className="grid gap-2">
					<CardTitle>Artículos</CardTitle>
					<CardDescription>
						Lista de artículos registrados en sistema.
					</CardDescription>
				</div>

				<InventorySearchBar status="idle" autoSubmit />
			</CardHeader>
			<CardContent className="h-[45dvh] overflow-y-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Descripción / Código</TableHead>
							<TableHead className="hidden lg:table-cell">Categoría</TableHead>
							<TableHead className="hidden md:table-cell">Stock</TableHead>
							<TableHead className="text-right">Precio Venta</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{items.map(item => (
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
										{item.family?.description}
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
			<CardFooter className='flex justify-end'>
				<PaginationBar total={totalItems}/>
			</CardFooter>
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

function LoadingSpinner({
	description = 'Cargando...',
}: {
	description?: string
}) {
	return (
		<div className="flex h-full w-full flex-col items-center justify-center gap-3 p-16  text-2xl">
			<Icon name="update" className="animate-spin text-4xl" />
			<div className="text-muted-foreground">{description}</div>
		</div>
	)
}
