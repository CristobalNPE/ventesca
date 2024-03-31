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
import { Icon, IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import {
	cn,
	formatCurrency,
	invariantResponse,
	useIsPending,
} from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { useForm } from '@conform-to/react'
import { parse } from '@conform-to/zod'
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
import { StockEditModal } from './__item-editors/stock-editor.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { PriceEditModal } from './__item-editors/price-editor.tsx'
import { SellingPriceEditModal } from './__item-editors/sellingPrice-editor.tsx'
import { CodeEditModal } from './__item-editors/code-editor.tsx'
import { NameEditModal } from './__item-editors/name-editor.tsx'
import { SelectSupplier } from '../providers_+/select-supplier.tsx'
import { SupplierEditModal } from './__item-editors/supplier-editor.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserId(request)
	const item = await prisma.item.findUnique({
		where: { id: params.itemId },
		select: {
			id: true,
			code: true,
			name: true,
			price: true,
			stock: true,
			createdAt: true,
			updatedAt: true,
			sellingPrice: true,
			family: { select: { description: true, id: true } },
			provider: { select: { fantasyName: true, id: true } },
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
	// const userId = await requireUserId(request)
	const formData = await request.formData()

	await validateCSRF(formData, request.headers)

	const submission = parse(formData, {
		schema: DeleteFormSchema,
	})
	if (submission.intent !== 'submit') {
		return json({ status: 'idle', submission } as const)
	}
	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
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
	// const navigate = useNavigate()
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
					<div className="hidden md:flex">
						<DeleteItemConfirmationModal itemId={item.id} />
					</div>
				)}
			</div>
			<Spacer size="4xs" />
			<div className="grid gap-4 2xl:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Detalles del Articulo</CardTitle>
						<CardDescription>Datos generales del articulo.</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-2 md:grid-cols-2 ">
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
					<CardContent className="grid gap-2 md:grid-cols-2 ">
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

				<Card>
					<CardHeader>
						<CardTitle>Datos Generales</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-2 md:grid-cols-2 ">
						<DataRow
							icon="user"
							label="Proveedor"
							value={item.provider?.fantasyName}
							isEditable={isAdmin}
							editModal={
								<SupplierEditModal
									id={item.id}
									icon={'user'}
									label={'Proveedor'}
									value={item.provider?.fantasyName ?? DEFAULT_EMPTY_NAME}
								/>
							}
						/>
						<DataRow
							icon="shapes"
							label="Categoría"
							value={item.family?.description}
							isEditable={isAdmin}
						/>
					</CardContent>
				</Card>

				{isAdmin && (
					<div className="flex w-full sm:m-auto sm:w-fit md:hidden">
						<DeleteItemConfirmationModal itemId={item.id} />
					</div>
				)}
			</div>
		</>
	)
}

//If we need to format a value on the edit modal, we can use the formatFn prop, but we need to also give the value as a Number in order for it to work correctly.

function DataRow({
	icon,
	label,
	value,
	isEditable,
	editModal,
	suffix,
}: {
	icon: IconName
	label: string
	value?: string | number
	isEditable?: boolean
	editModal?: JSX.Element
	suffix?: string
}) {
	const sanitizedValue = value ? value : 'Sin definir'

	return (
		<div className="flex items-center  justify-between gap-3  truncate rounded-md bg-secondary/70 p-2 font-semibold text-muted-foreground">
			<div className="flex gap-3">
				<Icon name={icon} className="shrink-0 text-3xl" />
				<div className="flex flex-col">
					<span>{label}</span>
					<span className="uppercase tracking-tight text-foreground">
						{sanitizedValue}{' '}
						<span className="lowercase tracking-normal text-muted-foreground">
							{suffix}
						</span>
					</span>
				</div>
			</div>
			{
				isEditable && editModal
				// This button opens a modal/drawer, with input to edit the value. Should also have a tooltip.
			}
		</div>
	)
}

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
		lastSubmission: actionData?.submission,
	})

	return (
		<Form method="POST" {...form.props}>
			<AuthenticityTokenInput />
			<input type="hidden" name="itemId" value={id} />
			<StatusButton
				type="submit"
				name="intent"
				value="delete-item"
				variant="destructive"
				status={isPending ? 'pending' : actionData?.status ?? 'idle'}
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
