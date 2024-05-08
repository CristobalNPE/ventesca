import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '#app/components/ui/alert-dialog.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '#app/components/ui/breadcrumb.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '#app/components/ui/hover-card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import {
	cn,
	formatCurrency,
	invariantResponse,
	useIsPending,
} from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { getFormProps, useForm } from '@conform-to/react'

import { DataRow } from '#app/components/data-row.tsx'
import { parseWithZod } from '@conform-to/zod'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react'
import { formatRelative, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { CategoryEditModal } from './__item-editors/category-editor.tsx'
import { CodeEditModal } from './__item-editors/code-editor.tsx'
import { NameEditModal } from './__item-editors/name-editor.tsx'
import { PriceEditModal } from './__item-editors/price-editor.tsx'
import { SellingPriceEditModal } from './__item-editors/sellingPrice-editor.tsx'
import { EditStatus } from './__item-editors/status-editor.tsx'
import { StockEditModal } from './__item-editors/stock-editor.tsx'
import { SupplierEditModal } from './__item-editors/supplier-editor.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserId(request)
	const item = await prisma.item.findUnique({
		where: { id: params.itemId },
		select: {
			id: true,
			isActive: true,
			code: true,
			name: true,
			price: true,
			stock: true,
			createdAt: true,
			updatedAt: true,
			sellingPrice: true,
			discounts: { select: { id: true } },
			category: { select: { description: true, id: true } },
			supplier: { select: { fantasyName: true, id: true } },
		},
	})

	invariantResponse(item, 'Not found', { status: 404 })

	return json({
		item: {
			...item,
			updatedAt: formatRelative(subDays(item.updatedAt, 0), new Date(), {
				locale: es,
			}),
			createdAt: formatRelative(subDays(item.createdAt, 0), new Date(), {
				locale: es,
			}),
		},
	})
}

const DeleteFormSchema = z.object({
	intent: z.literal('delete-item'),
	itemId: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
	await requireUserId(request)
	const formData = await request.formData()

	const submission = parseWithZod(formData, {
		schema: DeleteFormSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { itemId } = submission.value

	const item = await prisma.item.findFirst({
		select: { id: true, name: true },
		where: { id: itemId },
	})
	invariantResponse(item, 'Not found', { status: 404 })

	await prisma.item.delete({ where: { id: item.id } })

	return redirectWithToast(`/inventory`, {
		type: 'success',
		title: 'Articulo eliminado',
		description: `Articulo ${item.name} ha sido eliminado con éxito.`,
	})
}

export default function ItemRoute() {
	const isAdmin = true
	const { item } = useLoaderData<typeof loader>()

	const DEFAULT_EMPTY_NAME = 'Sin descripción'
	const activateConditions =
		!item.isActive && item.stock >= 1 && item.price > 0 && item.sellingPrice > 0

	console.log(activateConditions)
	return (
		<>
			<BreadCrumbs />

			<Spacer size="4xs" />
			<div className="flex flex-col gap-2 sm:gap-4  md:flex-row  md:justify-between">
				<div className="flex flex-col items-center justify-between gap-4 sm:flex-row md:justify-normal">
					<div className="flex gap-4">
						<Button
							variant={'outline'}
							size={'icon'}
							className="h-7 w-7"
							asChild
						>
							<Link to=".." relative="path">
								<Icon name="chevron-left" />
							</Link>
						</Button>
						<h1 className="text-xl font-bold capitalize tracking-tight">
							{item.name?.toLowerCase()}
						</h1>
					</div>
					<Badge
						variant={'outline'}
						className={cn(item.stock > 0 ? 'text-primary' : 'text-destructive')}
					>
						{item.stock > 0 ? 'En Stock' : 'Agotado'}
					</Badge>
				</div>

				{isAdmin && (
					<div className="hidden md:flex ">
						<DeleteItemConfirmationModal itemId={item.id} />
					</div>
				)}
			</div>
			<Spacer size="4xs" />

			<div className="grid gap-4  lg:grid-cols-7 lg:gap-6 2xl:grid-cols-3">
				<div className="col-span-3 grid auto-rows-max items-start gap-4 lg:col-span-4 lg:gap-6 2xl:col-span-2">
					<Card>
						<CardHeader>
							<CardTitle>Detalles del Articulo</CardTitle>
							<CardDescription>Datos generales del articulo.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-2 2xl:grid-cols-2 ">
							<DataRow
								icon="clock-up"
								label="Fecha ingreso"
								value={item.createdAt}
							/>
							<DataRow
								icon="clock"
								label="Ultima actualización"
								value={item.updatedAt}
							/>
							<DataRow icon="id" label="ID" value={item.id.toUpperCase()} />
							<DataRow
								icon="id-badge-2"
								label="Nombre"
								value={item.name ?? DEFAULT_EMPTY_NAME}
								isEditable={isAdmin}
								editModal={
									<NameEditModal
										id={item.id}
										icon={'id-badge-2'}
										label={'Nombre'}
										value={item.name ?? DEFAULT_EMPTY_NAME}
									/>
								}
							/>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>Información de venta</CardTitle>
							<CardDescription>
								Datos asociados a la venta del articulo.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-2 2xl:grid-cols-2 ">
							<DataRow
								icon="scan-barcode"
								label="Código"
								value={item.code.toString()}
								isEditable={isAdmin}
								editModal={
									<CodeEditModal
										id={item.id}
										icon={'scan-barcode'}
										label={'Código'}
										value={item.code}
									/>
								}
							/>
							<DataRow
								icon="package"
								label="Stock"
								value={item.stock.toString()}
								isEditable={isAdmin}
								suffix={item.stock !== 1 ? 'unidades' : 'unidad'}
								editModal={
									<StockEditModal
										id={item.id}
										icon={'package'}
										label={'Stock'}
										value={item.stock.toString()}
									/>
								}
							/>
							<DataRow
								icon="circle-dollar-sign"
								label="Valor"
								value={formatCurrency(item.price)}
								isEditable={isAdmin}
								editModal={
									<PriceEditModal
										id={item.id}
										icon={'circle-dollar-sign'}
										label={'Valor'}
										value={item.price ?? 0}
									/>
								}
							/>
							<DataRow
								icon="cash"
								label="Precio venta"
								value={formatCurrency(item.sellingPrice)}
								isEditable={isAdmin}
								editModal={
									<SellingPriceEditModal
										id={item.id}
										icon={'cash'}
										label={'Precio de venta'}
										value={item.sellingPrice ?? 0}
									/>
								}
							/>
						</CardContent>
					</Card>
				</div>
				<div className="col-span-3 grid auto-rows-max items-start gap-4 lg:gap-6 2xl:col-span-1">
					<Card className=" ">
						<CardHeader>
							<CardTitle>Datos Generales</CardTitle>
							<CardDescription>
								Modificar categoría y/o proveedor.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-2 ">
							<DataRow
								icon="user"
								label="Proveedor"
								value={item.supplier.fantasyName}
								isEditable={isAdmin}
								editModal={
									<SupplierEditModal
										id={item.id}
										icon={'user'}
										label={'Proveedor'}
										value={item.supplier.fantasyName ?? DEFAULT_EMPTY_NAME}
									/>
								}
							/>
							<DataRow
								icon="shapes"
								label="Categoría"
								value={item.category.description}
								isEditable={isAdmin}
								editModal={
									<CategoryEditModal
										id={item.id}
										icon={'shapes'}
										label={'Categoría'}
										value={item.category.description ?? DEFAULT_EMPTY_NAME}
									/>
								}
							/>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>Promociones</CardTitle>
							<CardDescription>
								{item.discounts.length === 0
									? `Ninguna promoción activa.`
									: item.discounts.length > 1
									  ? `${item.discounts.length} promociones activas.`
									  : `${item.discounts.length} promoción activa.`}
							</CardDescription>
						</CardHeader>
						{isAdmin && (
							<CardContent className="flex justify-end"></CardContent>
						)}
					</Card>
					<Card className="relative">
						<CardHeader className="">
							<CardTitle>Estado del articulo</CardTitle>
							<CardDescription>
								<span>El articulo se encuentra actualmente</span>{' '}
								<span
									className={cn(
										'font-bold',
										item.isActive ? 'text-primary' : 'text-destructive',
									)}
								>
									{item.isActive ? 'Disponible' : 'No Disponible'}
								</span>
								{!activateConditions && !item.isActive && (
									<HoverCard openDelay={200} closeDelay={300}>
										<HoverCardTrigger className="absolute right-3 top-3 transition-all hover:scale-105 hover:text-foreground">
											<Icon className="ml-2 text-3xl" name="help" />
										</HoverCardTrigger>
										<HoverCardContent className="flex flex-col gap-2">
											{item.stock < 1 && (
												<div className="flex items-center gap-2 ">
													<Icon
														name="exclamation-circle"
														className="shrink-0"
													/>
													Debe definir un stock valido.
												</div>
											)}
											{item.price <= 0 && (
												<div className="flex items-center gap-2 ">
													<Icon
														name="exclamation-circle"
														className="shrink-0"
													/>
													Debe definir un valor valido mayor a 0.
												</div>
											)}
											{item.sellingPrice <= 0 && (
												<div className="flex items-center gap-2 ">
													<Icon
														name="exclamation-circle"
														className="shrink-0"
													/>
													Debe definir un precio de venta valido mayor a 0.
												</div>
											)}
										</HoverCardContent>
									</HoverCard>
								)}
							</CardDescription>
						</CardHeader>
						{isAdmin && (
							<CardContent className="grid place-items-center md:place-content-end">
								<EditStatus
									isActive={item.isActive}
									disabled={!activateConditions}
									itemId={item.id}
								/>
							</CardContent>
						)}
					</Card>
					{isAdmin && (
						<div className="flex w-full sm:m-auto sm:w-fit md:hidden">
							<DeleteItemConfirmationModal itemId={item.id} />
						</div>
					)}
				</div>
			</div>
		</>
	)
}

//If we need to format a value on the edit modal, we can use the formatFn prop, but we need to also give the value as a Number in order for it to work correctly.

function BreadCrumbs() {
	return (
		<Breadcrumb className="hidden md:flex">
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link to="/inventory">Inventario</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link className="text-foreground" to=".">
							Detalles articulo
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}

function DeleteItemConfirmationModal({ itemId }: { itemId: string }) {
	return (
		<div className="flex w-full gap-4">
			<AlertDialog>
				<AlertDialogTrigger asChild>
					<Button
						variant={'outline'}
						className="flex w-full items-center gap-2"
					>
						<Icon name="trash" />
						<span>Eliminar</span>
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Confirmar eliminación de articulo
						</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción no se puede deshacer. Por favor confirme que desea
							eliminar el articulo.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="flex gap-6">
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<DeleteItem id={itemId} />
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

export function DeleteItem({ id }: { id: string }) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [form] = useForm({
		id: 'delete-item',
		lastResult: actionData?.result,
	})

	return (
		<Form method="POST" {...getFormProps(form)}>
			<AuthenticityTokenInput />
			<input type="hidden" name="itemId" value={id} />
			<StatusButton
				type="submit"
				name="intent"
				value="delete-item"
				variant="destructive"
				status={isPending ? 'pending' : form.status ?? 'idle'}
				disabled={isPending}
			>
				<div className="flex items-center gap-1 ">
					<Icon name="trash" />
					<span>Eliminar</span>
				</div>
			</StatusButton>
			<ErrorList errors={form.errors} id={form.errorId} />
		</Form>
	)
}

// export const meta: MetaFunction<
// 	typeof loader,
// 	{ 'routes/users+/$username_+/notes': typeof notesLoader }
// > = ({ data, params, matches }) => {
// 	const notesMatch = matches.find(
// 		m => m.id === 'routes/users+/$username_+/notes',
// 	)
// 	const displayName = notesMatch?.data?.owner.name ?? params.username
// 	const noteTitle = data?.note.title ?? 'Note'
// 	const noteContentsSummary =
// 		data && data.note.content.length > 100
// 			? data?.note.content.slice(0, 97) + '...'
// 			: 'No content'
// 	return [
// 		{ title: `${noteTitle} | ${displayName}'s Notes | Epic Notes` },
// 		{
// 			name: 'description',
// 			content: noteContentsSummary,
// 		},
// 	]
// }

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>No posee los permisos necesarios.</p>,
				404: ({ params }) => (
					<p>No existe articulo con ID: "{params.itemId}"</p>
				),
			}}
		/>
	)
}
