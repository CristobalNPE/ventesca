import { Spacer } from '#app/components/spacer.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon, IconName } from '#app/components/ui/icon.tsx'
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
import { formatCurrency } from '#app/utils/misc.tsx'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, useNavigate } from '@remix-run/react'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)
	// const url = new URL(request.url)
	// const searchTerm = url.searchParams.get('search')

	// const byProvider = url.searchParams.get('by-provider')

	// if (byProvider) {
	// 	const items = prisma.item
	// 		.findMany({
	// 			orderBy: { code: 'asc' },
	// 			select: {
	// 				id: true,
	// 				code: true,
	// 				name: true,
	// 				sellingPrice: true,
	// 				price: true,
	// 				stock: true,
	// 				family: { select: { description: true } },
	// 			},
	// 			where: {
	// 				providerId: byProvider,
	// 			},
	// 		})
	// 		.then(u => u)

	// 	const totalItems = await prisma.item.count()

	// 	return defer({ items, totalItems })
	// }

	// if (searchTerm === '') {
	// 	return redirect('/inventory')
	// }

	const items = await prisma.item.findMany({
		orderBy: { code: 'asc' },
		select: {
			id: true,
			code: true,
			name: true,
			sellingPrice: true,
			stock: true,
			family: { select: { description: true } },
		},
		// where: {
		// 	code: searchTerm ? parseInt(searchTerm.toString()) : undefined,
		// },
	})

	const totalItems = await prisma.item.count()

	const noStockItems = await prisma.item.count({
		where: {
			stock: 0,
		},
	})

	return json({ items, totalItems, noStockItems })
}

export default function InventoryRoute() {
	const isAdmin = true
	const { items, totalItems, noStockItems } = useLoaderData<typeof loader>()

	return (
		<main className="flex flex-col">
			<div className="flex justify-between border-b-2 border-secondary pb-3">
				<h1 className="text-xl font-semibold">Administración de Inventario</h1>
			</div>
			<Spacer size={'4xs'} />
			<div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
				<DataCard
					title={'Artículos Registrados'}
					value={`${totalItems}`}
					icon={'package'}
					subtext={'5 artículos nuevos este mes'}
				/>
				<DataCard
					title={'Artículos Sin Stock'}
					value={`${noStockItems}`}
					icon={'box-off'}
					subtext={'15 artículos próximos a agotarse'}
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

			<ItemsTableCard items={items} />
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
function ItemsTableCard({ items }: { items: ItemData[] }) {
	const navigate = useNavigate()

	return (
		<Card className=" max-h-[63dvh] overflow-y-scroll xl:col-span-2">
			<CardHeader className="flex flex-row items-center ">
				<div className="grid gap-2">
					<CardTitle>Artículos</CardTitle>
					<CardDescription>
						Lista de artículos registrados en sistema.
					</CardDescription>
				</div>
				{/* Search bar goes here */}
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Código / Descripción</TableHead>
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
										{item.id}
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
		</Card>
	)
}
