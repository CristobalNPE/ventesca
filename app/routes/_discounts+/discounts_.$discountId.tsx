import { Spacer } from '#app/components/spacer.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
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
import { Icon } from '#app/components/ui/icon.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import {
	cn,
	formatCurrency,
	invariantResponse,
	useIsPending,
} from '#app/utils/misc.tsx'
import { ActionFunctionArgs, LoaderFunctionArgs, json } from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'

import { DataRow } from '#app/components/data-row.tsx'
import { Link } from '@remix-run/react'
import { format, formatDistance, formatRelative, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { DiscountType } from './_types/discount-type.ts'
import { DiscountApplicationMethod } from './_types/discount-applicationMethod.ts'
import { DiscountScope } from './_types/discount-reach.ts'
import { DiscountItemsList } from './discounts.item-picker.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { getFormProps, useForm } from '@conform-to/react'
import { ErrorList } from '#app/components/forms.tsx'
import { z } from 'zod'
import { parseWithZod } from '@conform-to/zod'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { DiscountNameEditModal } from './__discounts-editors/name-editor.tsx'

const DeleteFormSchema = z.object({
	intent: z.literal('delete-discount'),
	discountId: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
	await requireUserId(request)
	const formData = await request.formData()

	const submission = parseWithZod(formData, { schema: DeleteFormSchema })

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { discountId } = submission.value

	const discount = await prisma.discount.findFirst({
		select: { id: true, name: true },
		where: { id: discountId },
	})

	invariantResponse(discount, 'Not found', { status: 404 })

	await prisma.discount.delete({ where: { id: discountId } })
	return redirectWithToast(`/discounts`, {
		type: 'success',
		title: 'Descuento eliminado',
		description: `Descuento [${discount.name}] ha sido eliminado con éxito.`,
	})
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserId(request)

	const discount = await prisma.discount.findUnique({
		where: { id: params.discountId },
		select: {
			id: true,
			name: true,
			description: true,
			isActive: true,
			minimumQuantity: true,
			scope: true,
			type: true,
			applicationMethod: true,
			value: true,
			items: {
				select: { id: true, name: true, code: true, sellingPrice: true },
			},
			createdAt: true,
			updatedAt: true,
			validFrom: true,
			validUntil: true,
		},
	})

	invariantResponse(discount, 'Not found', { status: 404 })

	return json({
		discount: {
			...discount,
			updatedAt: formatDistance(subDays(discount.updatedAt, 0), new Date(), {
				addSuffix: true,
				locale: es,
			}),
			createdAt: formatRelative(subDays(discount.createdAt, 0), new Date(), {
				locale: es,
			}),
			validFrom: format(
				discount.validFrom,
				"dd 'de' MMMM yyyy, 'a las' HH:mm",
				{ locale: es },
			),
			validUntil: format(
				discount.validUntil,
				"dd 'de' MMMM yyyy, 'a las' HH:mm",
				{ locale: es },
			),
		},
	})
}

export default function DiscountRoute() {
	const isAdmin = true
	const { discount } = useLoaderData<typeof loader>()

	// const DEFAULT_EMPTY_NAME = 'Sin descripción'
	// const activateConditions =
	// 	!item.isActive && item.stock >= 1 && item.price > 0 && item.sellingPrice > 0

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
							{discount.name.toLowerCase()}
						</h1>
					</div>
					<Badge
						variant={'outline'}
						className={cn(
							discount.isActive ? 'text-primary' : 'text-destructive',
						)}
					>
						{discount.isActive ? 'Activo' : 'Inactivo'}
					</Badge>
				</div>

				{/* WE MIGHT NEED TO CHECK MODEL CASCADE WHEN DELETING !!! */}
				{isAdmin && (
					<div className="hidden md:flex ">
						<DeleteDiscountConfirmationModal discountId={discount.id} />
					</div>
				)}
			</div>
			<Spacer size="4xs" />

			<div className="grid gap-4  lg:grid-cols-7 lg:gap-6 2xl:grid-cols-3">
				<div className="col-span-3 grid auto-rows-max items-start gap-4 lg:col-span-4 lg:gap-6 2xl:col-span-2">
					<Card>
						<CardHeader>
							<CardTitle>Datos Generales</CardTitle>
							<CardDescription>Datos generales del descuento.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-2 2xl:grid-cols-2 ">
							<DataRow
								icon="clock-up"
								label="Fecha ingreso"
								value={discount.createdAt}
							/>
							<DataRow
								icon="clock"
								label="Ultima actualización"
								value={discount.updatedAt}
							/>
							<DataRow icon="id" label="ID" value={discount.id.toUpperCase()} />
							<DataRow
								icon="id-badge-2"
								label="Nombre"
								value={discount.name}
								isEditable={isAdmin}
								editModal={
									<DiscountNameEditModal
										id={discount.id}
										icon={'id-badge-2'}
										label={'Nombre'}
										value={discount.name}
									/>
								}
							/>
							<DataRow
								icon="file-text"
								label="Descripción"
								value={discount.description}
								className="overflow-auto whitespace-normal normal-case tracking-normal 2xl:col-span-2"
								// isEditable={isAdmin}
								// editModal={
								// 	<NameEditModal
								// 		id={item.id}
								// 		icon={'id-badge-2'}
								// 		label={'Nombre'}
								// 		value={item.name ?? DEFAULT_EMPTY_NAME}
								// 	/>
								// }
							/>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle>Detalles</CardTitle>
							<CardDescription>
								Detalles y requisitos del descuento.
							</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-2 2xl:grid-cols-2 ">
							<DataRow
								icon="checklist"
								label="Cantidad minima requerida"
								value={discount.minimumQuantity}
								suffix={`${
									discount.minimumQuantity !== 1 ? 'unidades' : 'unidad'
								}.`}
							/>
							<DataRow
								icon={
									discount.type === DiscountType.FIXED
										? 'currency-dollar'
										: 'circle-percentage'
								}
								label="Valor del descuento"
								value={`${
									discount.type === DiscountType.FIXED
										? formatCurrency(discount.value)
										: `${discount.value}%`
								} `}
							/>
							<DataRow
								icon="id"
								label="Método de aplicación"
								value={
									discount.applicationMethod ===
									DiscountApplicationMethod.BY_ITEM
										? 'Por articulo'
										: 'Al total'
								}
							/>
							<DataRow
								icon="id"
								label="Alcance"
								value={
									discount.scope === DiscountScope.GLOBAL
										? 'Global'
										: discount.scope === DiscountScope.CATEGORY
										  ? `X categorías (${discount.items.length} artículos.)`
										  : `${discount.items.length} artículos.`
								}
							/>
							<DataRow
								icon="id-badge-2"
								label="Fecha inicio"
								value={discount.validFrom}
								// isEditable={isAdmin}
								// editModal={
								// 	<NameEditModal
								// 		id={item.id}
								// 		icon={'id-badge-2'}
								// 		label={'Nombre'}
								// 		value={item.name ?? DEFAULT_EMPTY_NAME}
								// 	/>
								// }
							/>
							<DataRow
								icon="id-badge-2"
								label="Fecha termino"
								value={discount.validUntil}
								// isEditable={isAdmin}
								// editModal={
								// 	<NameEditModal
								// 		id={item.id}
								// 		icon={'id-badge-2'}
								// 		label={'Nombre'}
								// 		value={item.name ?? DEFAULT_EMPTY_NAME}
								// 	/>
								// }
							/>
						</CardContent>
					</Card>
				</div>
				<div className="col-span-3 grid auto-rows-max items-start gap-4 lg:gap-6 2xl:col-span-1">
					<Card className="">
						<CardHeader>
							<CardTitle>Artículos asociados</CardTitle>
							<CardDescription>
								Lista de artículos asociados al descuento.
							</CardDescription>
						</CardHeader>
						<CardContent className=" ">
							<ScrollArea className="h-[23rem] rounded-sm p-3">
								<DiscountItemsList
									addedItems={discount.items}
									canRemove={false}
									showDetailsLink
								/>
							</ScrollArea>
						</CardContent>
					</Card>
					<Card className="">
						<CardHeader>
							<CardTitle>Desactivar descuento</CardTitle>
							<CardDescription>
								Deshabilita el descuento independientemente del tiempo restante.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex justify-end ">
							<Button variant={'outline'}>Desactivar</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</>
	)
}

function BreadCrumbs() {
	return (
		<Breadcrumb className="hidden md:flex">
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link to="/discounts">Descuentos</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
				<BreadcrumbSeparator />
				<BreadcrumbItem>
					<BreadcrumbLink asChild>
						<Link className="text-foreground" to=".">
							Detalles descuento
						</Link>
					</BreadcrumbLink>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}

function DeleteDiscountConfirmationModal({
	discountId,
}: {
	discountId: string
}) {
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
							Confirmar eliminación del descuento
						</AlertDialogTitle>
						<AlertDialogDescription>
							Esta acción no se puede deshacer. Por favor confirme que desea
							eliminar el descuento.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="flex gap-6">
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<DeleteDiscount id={discountId} />
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
export function DeleteDiscount({ id }: { id: string }) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [form] = useForm({
		id: 'delete-discount',
		lastResult: actionData?.result,
	})

	return (
		<Form method="POST" {...getFormProps(form)}>
			<input type="hidden" name="discountId" value={id} />
			<StatusButton
				type="submit"
				name="intent"
				value="delete-discount"
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
