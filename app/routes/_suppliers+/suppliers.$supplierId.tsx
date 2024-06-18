import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { format as formatRut } from '@validatecl/rut'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { DetailsCard } from '#app/components/details-card.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Icon, IconName } from '#app/components/ui/icon.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'

import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { userHasRole, useUser } from '#app/utils/user.ts'
import { ItemDetailsSheet } from '../inventory_+/product-sheet.tsx'
import {
	DELETE_SUPPLIER_KEY,
	DeleteSupplier,
	DeleteSupplierSchema,
} from './__delete-supplier.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const supplier = await prisma.supplier.findUnique({
		where: { id: params.supplierId, businessId },
		select: {
			id: true,
			address: true,
			rut: true,
			name: true,
			city: true,
			fantasyName: true,
			phone: true,
			email: true,
			createdAt: true,
			updatedAt: true,
			products: { select: { id: true, code: true, name: true } },
			isEssential: true,
		},
	})

	invariantResponse(supplier, 'Not Found', { status: 404 })

	return json({ supplier })
}

export async function action({ request }: ActionFunctionArgs) {
	await requireUserWithRole(request, 'Administrador')
	// const businessId = await getBusinessId(userId)
	const formData = await request.formData()
	const intent = formData.get('intent')
	invariantResponse(intent, 'Intent should be defined.')
	switch (intent) {
		case DELETE_SUPPLIER_KEY: {
			return await handleDeleteSupplier(formData)
		}
	}
}

export default function SupplierRoute() {
	const { supplier } = useLoaderData<typeof loader>()
	const user = useUser()
	const isAdmin = userHasRole(user, 'Administrador')

	return (
		<Card className="flex h-[85dvh] animate-slide-left flex-col overflow-hidden">
			<CardHeader className="flex flex-row items-start justify-between bg-muted/50">
				<div className="grid gap-0.5">
					<CardTitle className="group flex items-center gap-2 text-lg">
						<div className="flex gap-4 text-lg">
							<span>{supplier?.fantasyName}</span>
							<Badge
								variant={'secondary'}
								className="flex items-center justify-center gap-1"
							>
								<Icon className="shrink-0" name="id-badge-2" />
								{formatRut(supplier.rut)}
							</Badge>
						</div>
						<Button
							size="icon"
							variant="outline"
							className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<Icon name="copy" className="h-3 w-3" />
							<span className="sr-only">Copiar RUT proveedor</span>
						</Button>
					</CardTitle>
					<CardDescription>
						Fecha registro:
						{format(new Date(supplier.createdAt), " dd' de 'MMMM', 'yyyy", {
							locale: es,
						})}
					</CardDescription>
				</div>

				{isAdmin ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button size={'sm'} className="h-7 w-7" variant={'outline'}>
								<Icon className="shrink-0" name="dots-vertical" />
								<span className="sr-only">Opciones</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent className="flex flex-col gap-2 " align="end">
							<DropdownMenuItem asChild>
								<Button
									asChild
									size="sm"
									variant="outline"
									className="h-8 gap-1"
								>
									<Link to={'edit'}>
										<Icon name="update" className="h-3.5 w-3.5" />
										<span className="lg:sr-only xl:not-sr-only xl:whitespace-nowrap">
											Editar proveedor
										</span>
									</Link>
								</Button>
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								{/* <ChangeItemsCategory /> */}
								{/* REPLACE WITH CHANGE ITEMS FROM PROVIDER IN MASS */}
							</DropdownMenuItem>
							{!supplier.isEssential ? (
								<>
									<DropdownMenuSeparator />
									<DropdownMenuItem asChild>
										<DeleteSupplier
											id={supplier.id}
											numberOfItems={supplier.products.length}
										/>
									</DropdownMenuItem>
								</>
							) : null}
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</CardHeader>
			<CardContent className="grid flex-1 gap-10 p-6 text-sm xl:grid-cols-5">
				<div className="col-span-3 flex flex-col gap-4">
					<DetailsCard
						icon={'id'}
						description={'ID'}
						data={supplier.id.toUpperCase()}
					/>
					<DetailsCard
						icon={'id-badge-2'}
						description={'RUT'}
						data={formatRut(supplier.rut)}
					/>
					<DetailsCard
						icon={'user'}
						description={'Representante'}
						data={supplier.name}
					/>
					<DetailsCard
						icon={'map'}
						description={'Dirección'}
						data={supplier.address}
					/>
					<DetailsCard
						icon={'map-pin-filled'}
						description={'Ciudad'}
						data={supplier.city}
					/>
					<DetailsCard
						icon={'phone'}
						description={'Teléfono contacto'}
						data={supplier.phone}
					/>
					<DetailsCard
						icon={'envelope-closed'}
						description={'Correo electrónico'}
						data={supplier.email}
					/>
				</div>
				<div className="col-span-2 flex flex-col gap-3">
					<div className="font-semibold">
						Productos asociados ( {supplier.products.length} )
					</div>
					<ScrollArea className="h-[34.7rem]">
						<ul className="grid gap-3">
							{supplier.products.map(product => (
								<li
									key={product.id}
									className="flex items-center justify-between rounded-sm transition-colors duration-100 hover:bg-secondary"
								>
									<div className="flex w-full items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<ItemDetailsSheet itemId={product.id} />
											<span className="w-[14rem] text-muted-foreground">
												{product.name}
											</span>
										</div>
										<div className="flex  min-w-[4rem]  items-center gap-1 rounded-sm border-l-2 px-1">
											<Icon className="shrink-0" name="scan-barcode" />
											<span>{product.code}</span>
										</div>
									</div>
								</li>
							))}
						</ul>
					</ScrollArea>
				</div>
			</CardContent>
			<CardFooter className="flex flex-row items-center border-t bg-muted/50 px-6 py-3">
				<div className="text-xs text-muted-foreground">
					Actualizada por ultima vez el{' '}
					{format(
						new Date(supplier.updatedAt),
						"dd 'de' MMMM', 'yyyy' a las' hh:mm",
						{
							locale: es,
						},
					)}
				</div>
			</CardFooter>
		</Card>
	)
}

async function handleDeleteSupplier(formData: FormData) {
	const submission = parseWithZod(formData, {
		schema: DeleteSupplierSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { supplierId } = submission.value

	const supplier = await prisma.supplier.findFirst({
		select: { id: true, fantasyName: true },
		where: { id: supplierId },
	})

	invariantResponse(supplier, 'Supplier not found', { status: 404 })

	await prisma.supplier.delete({ where: { id: supplier.id } })

	return redirectWithToast(`/suppliers`, {
		type: 'success',
		title: 'Proveedor eliminado',
		description: `Proveedor "${supplier.fantasyName}" ha sido eliminado con éxito.`,
	})
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>No tiene los permisos necesarios.</p>,
				404: ({ params }) => (
					<div className="flex flex-col items-center justify-center gap-2">
						<Icon className="text-5xl" name="exclamation-circle" />
						<p>No existe proveedor con ID:</p>
						<p className="text-lg">"{params.supplierId}"</p>
					</div>
				),
			}}
		/>
	)
}
