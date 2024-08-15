import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '#app/components/ui/select.tsx'
import {
	Table,
	TableCaption,
	TableHeader,
	TableRow,
	TableHead,
	TableBody,
	TableCell,
} from '#app/components/ui/table.tsx'
import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const categories = await prisma.category.findMany({
		where: { businessId },
		select: { id: true, description: true, isEssential: true },
	})

	const suppliers = await prisma.supplier.findMany({
		where: { businessId },
		select: { id: true, fantasyName: true, isEssential: true },
	})

	return json({ categories, suppliers })
}

export default function NewProducts() {
	const { categories, suppliers } = useLoaderData<typeof loader>()

	return (
		<main className="flex h-full  flex-col gap-4">
			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center lg:flex-row lg:text-left">
				<h1 className="text-xl font-semibold">Ingreso de Productos</h1>
			</div>

			<div className="flex-1">
				<Table className="rounded-md bg-card  shadow-sm ">
					<TableHeader>
						<TableRow>
							<TableHead className="font-semibold text-foreground">
								Código
							</TableHead>
							<TableHead className="font-semibold text-foreground">
								Nombre del Producto
							</TableHead>
							<TableHead className="font-semibold text-foreground">
								Valor
							</TableHead>
							<TableHead className="font-semibold text-foreground">
								Precio de Venta
							</TableHead>
							<TableHead className="font-semibold text-foreground">
								Stock Inicial
							</TableHead>
							<TableHead className="font-semibold text-foreground">
								Categoría
							</TableHead>
							<TableHead className="font-semibold text-foreground">
								Proveedor
							</TableHead>
							<TableHead className="font-semibold text-foreground"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow>
							<TableCell className="font-medium">
								<Input />
							</TableCell>
							<TableCell>
								<Input />
							</TableCell>
							<TableCell>
								<Input />
							</TableCell>
							<TableCell>
								<Input />
							</TableCell>
							<TableCell>
								<Input />
							</TableCell>
							<TableCell>
								<Select>
									<SelectTrigger className="w-[180px]">
										<SelectValue placeholder="Seleccione" />
									</SelectTrigger>
									<SelectContent>
										{categories.map(category => (
											<SelectItem
												defaultChecked={category.isEssential}
												key={category.id}
												value={category.id}
											>
												{category.description}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</TableCell>
							<TableCell>
								<Select>
									<SelectTrigger className="w-[180px]">
										<SelectValue placeholder="Seleccione" />
									</SelectTrigger>
									<SelectContent>
										{suppliers.map(supplier => (
											<SelectItem
												defaultChecked={supplier.isEssential}
												key={supplier.id}
												value={supplier.id}
											>
												{supplier.fantasyName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</TableCell>
							<TableCell>
								<Button tabIndex={-1} size={'sm'} variant={'destructive'}>
									<Icon name="trash" />
								</Button>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</div>
			<div>
				<Button>Registrar productos</Button>
			</div>
		</main>
	)
}
