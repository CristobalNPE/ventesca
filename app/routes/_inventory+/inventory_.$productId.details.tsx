import { getFormProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react'
import { formatRelative, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { z } from 'zod'
import { DataRow } from '#app/components/data-row.tsx'
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
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency, useIsPending } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'

import { userHasRole, useUser } from '#app/utils/user.ts'
import { DiscountScope } from '../_discounts+/_types/discount-reach.ts'
import { CategoryEditModal } from './__product-editors/category-editor.tsx'
import { CodeEditModal } from './__product-editors/code-editor.tsx'
import { ItemNameEditModal } from './__product-editors/name-editor.tsx'
import { PriceEditModal } from './__product-editors/price-editor.tsx'
import { SellingPriceEditModal } from './__product-editors/sellingPrice-editor.tsx'
import { EditStatus } from './__product-editors/status-editor.tsx'
import { StockEditModal } from './__product-editors/stock-editor.tsx'
import { SupplierEditModal } from './__product-editors/supplier-editor.tsx'
import { softDeleteProduct } from './productService.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const productPromise = prisma.product.findUnique({
		where: { id: params.productId, businessId },
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
			discounts: { select: { id: true, name: true } },
			category: { select: { description: true, id: true } },
			supplier: { select: { fantasyName: true, id: true } },
		},
	})

	const globalDiscountsPromise = prisma.discount.findMany({
		where: { scope: DiscountScope.GLOBAL },
		select: { id: true, name: true },
	})

	const [product, globalDiscounts] = await Promise.all([
		productPromise,
		globalDiscountsPromise,
	])

	invariantResponse(product, 'Not found', { status: 404 })

	return json({
		product: {
			...product,
			updatedAt: formatRelative(subDays(product.updatedAt, 0), new Date(), {
				locale: es,
			}),
			createdAt: formatRelative(subDays(product.createdAt, 0), new Date(), {
				locale: es,
			}),
		},
		globalDiscounts,
	})
}

const DeleteFormSchema = z.object({
	intent: z.literal('delete-product'),
	productId: z.string(),
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

	const { productId } = submission.value

	const product = await prisma.product.findFirst({
		select: { id: true, name: true },
		where: { id: productId },
	})
	invariantResponse(product, 'Not found', { status: 404 })

	await softDeleteProduct(productId)

	return redirectWithToast(`/inventory`, {
		type: 'success',
		title: 'Articulo eliminado',
		description: `Articulo ${product.name} ha sido eliminado con éxito.`,
	})
}

export default function ProductRoute() {
	const user = useUser()
	const isAdmin = userHasRole(user, 'Administrador')
	const { product, globalDiscounts } = useLoaderData<typeof loader>()

	const allAssociatedDiscounts = [...globalDiscounts, ...product.discounts]

	const activateConditions =
		!product.isActive &&
		product.stock >= 1 &&
		product.price > 0 &&
		product.sellingPrice > 0

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
							{product.name?.toLowerCase()}
						</h1>
					</div>
					<Badge
						variant={'outline'}
						className={cn(
							product.stock > 0 ? 'text-primary' : 'text-destructive',
						)}
					>
						{product.stock > 0 ? 'En Stock' : 'Agotado'}
					</Badge>
				</div>

				{isAdmin && (
					<div className="hidden md:flex ">
						<DeleteProductConfirmationModal itemId={product.id} />
					</div>
				)}
			</div>
			<Spacer size="4xs" />

			<div className="grid  gap-4 lg:grid-cols-7 lg:gap-6 2xl:grid-cols-3">
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
								value={product.createdAt}
							/>
							<DataRow
								icon="clock"
								label="Ultima actualización"
								value={product.updatedAt}
							/>
							<DataRow icon="id" label="ID" value={product.id.toUpperCase()} />
							<DataRow
								icon="id-badge-2"
								label="Nombre"
								value={product.name}
								isEditable={isAdmin}
								editModal={
									<ItemNameEditModal
										id={product.id}
										icon={'id-badge-2'}
										label={'Nombre'}
										value={product.name}
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
								value={product.code.toString()}
								isEditable={isAdmin}
								editModal={
									<CodeEditModal
										id={product.id}
										icon={'scan-barcode'}
										label={'Código'}
										value={product.code}
									/>
								}
							/>
							<DataRow
								icon="package"
								label="Stock"
								value={product.stock.toString()}
								isEditable={isAdmin}
								suffix={product.stock !== 1 ? 'unidades' : 'unidad'}
								editModal={
									<StockEditModal
										id={product.id}
										icon={'package'}
										label={'Stock'}
										value={product.stock.toString()}
									/>
								}
							/>
							<DataRow
								icon="circle-dollar-sign"
								label="Valor"
								value={formatCurrency(product.price)}
								isEditable={isAdmin}
								editModal={
									<PriceEditModal
										id={product.id}
										icon={'circle-dollar-sign'}
										label={'Valor'}
										value={product.price ?? 0}
									/>
								}
							/>
							<DataRow
								icon="cash"
								label="Precio venta"
								value={formatCurrency(product.sellingPrice)}
								isEditable={isAdmin}
								editModal={
									<SellingPriceEditModal
										id={product.id}
										icon={'cash'}
										label={'Precio de venta'}
										value={product.sellingPrice ?? 0}
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
								value={product.supplier.fantasyName}
								isEditable={isAdmin}
								editModal={
									<SupplierEditModal
										id={product.id}
										icon={'user'}
										label={'Proveedor'}
										value={product.supplier.fantasyName}
									/>
								}
							/>
							<DataRow
								icon="shapes"
								label="Categoría"
								value={product.category.description}
								isEditable={isAdmin}
								editModal={
									<CategoryEditModal
										id={product.id}
										icon={'shapes'}
										label={'Categoría'}
										value={product.category.description}
									/>
								}
							/>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>
								{allAssociatedDiscounts.length === 0
									? `Sin descuentos asociados.`
									: allAssociatedDiscounts.length > 1
										? `${allAssociatedDiscounts.length} Descuentos asociados.`
										: `${allAssociatedDiscounts.length} Descuento asociado.`}
							</CardTitle>
							<CardDescription></CardDescription>
						</CardHeader>

						<CardContent className="flex flex-col gap-1">
							{allAssociatedDiscounts.map(discount => (
								<div
									className="flex items-center gap-1 text-xs"
									key={discount.id}
								>
									<Icon name="tag" />
									<span>{discount.name}</span>
								</div>
							))}
						</CardContent>
					</Card>
					<Card className="relative">
						<CardHeader className="">
							<CardTitle>Estado del articulo</CardTitle>
							<CardDescription>
								<span>El articulo se encuentra actualmente</span>{' '}
								<span
									className={cn(
										'font-bold',
										product.isActive ? 'text-primary' : 'text-destructive',
									)}
								>
									{product.isActive ? 'Disponible' : 'No Disponible'}
								</span>
								{!activateConditions && !product.isActive && (
									<HoverCard openDelay={200} closeDelay={300}>
										<HoverCardTrigger className="absolute right-3 top-3 transition-all hover:scale-105 hover:text-foreground">
											<Icon className="ml-2 text-3xl" name="help" />
										</HoverCardTrigger>
										<HoverCardContent className="flex flex-col gap-2">
											{product.stock < 1 && (
												<div className="flex items-center gap-2 ">
													<Icon
														name="exclamation-circle"
														className="shrink-0"
													/>
													Debe definir un stock valido.
												</div>
											)}
											{product.price <= 0 && (
												<div className="flex items-center gap-2 ">
													<Icon
														name="exclamation-circle"
														className="shrink-0"
													/>
													Debe definir un valor valido mayor a 0.
												</div>
											)}
											{product.sellingPrice <= 0 && (
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
									isActive={product.isActive}
									disabled={!activateConditions}
									productId={product.id}
								/>
							</CardContent>
						)}
					</Card>
					{isAdmin && (
						<div className="flex w-full sm:m-auto sm:w-fit md:hidden">
							<DeleteProductConfirmationModal itemId={product.id} />
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

function DeleteProductConfirmationModal({ itemId }: { itemId: string }) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant={'outline'} className="flex w-full items-center gap-2">
					<Icon name="trash" />
					<span>Eliminar</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmar eliminación de articulo</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción no se puede deshacer. Por favor confirme que desea
						eliminar el articulo.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="flex gap-6">
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<DeleteProduct id={itemId} />
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

export function DeleteProduct({ id }: { id: string }) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [form] = useForm({
		id: 'delete-product',
		lastResult: actionData?.result,
	})

	return (
		<Form method="POST" {...getFormProps(form)}>
			<input type="hidden" name="productId" value={id} />
			<StatusButton
				type="submit"
				name="intent"
				value="delete-product"
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
					<p>No existe articulo con ID: "{params.productId}"</p>
				),
			}}
		/>
	)
}
