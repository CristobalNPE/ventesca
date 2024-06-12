import { getFormProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { type Discount } from '@prisma/client'
import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/node'
import { Form, useActionData, useLoaderData , Link } from '@remix-run/react'
import { format, formatDistance, formatRelative, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { z } from 'zod'
import { DataRow } from '#app/components/data-row.tsx'
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
import { Icon } from '#app/components/ui/icon.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency, useIsPending } from '#app/utils/misc.tsx'

import { ErrorList } from '#app/components/forms.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'

import { DiscountAppmethodEditModal } from './__discounts-editors/applicationMethod-editor.tsx'
import { DiscountDescriptionEditModal } from './__discounts-editors/description-editor.tsx'
import { DiscountNameEditModal } from './__discounts-editors/name-editor.tsx'
import { DiscountMinquantityEditModal } from './__discounts-editors/quantity-editor.tsx'
import { DiscountTypeEditModal } from './__discounts-editors/type-editor.tsx'
import { DiscountValidperiodEditModal } from './__discounts-editors/validPeriod-editor.tsx'
import { DiscountValueEditModal } from './__discounts-editors/value-editor.tsx'
import { discountAppmethodNames } from './_constants/discountAppmethodNames.ts'
import { discountTypeNames } from './_constants/discountTypeNames.ts'
import { DiscountApplicationMethod } from './_types/discount-applicationMethod.ts'
import { DiscountScope } from './_types/discount-reach.ts'
import { DiscountType } from './_types/discount-type.ts'
import { DiscountItemsList } from './discounts.item-picker.tsx'

const DeleteFormSchema = z.object({
	intent: z.literal('delete-discount'),
	discountId: z.string(),
})

export async function updateDiscountValidity(
	discount: Pick<Discount, 'id' | 'validFrom' | 'validUntil'>,
) {
	const currentDate = new Date()

	const isInValidPeriod =
		currentDate >= new Date(discount.validFrom) &&
		currentDate <= new Date(discount.validUntil)
	await prisma.discount.update({
		where: { id: discount.id },
		data: {
			isActive: isInValidPeriod,
		},
	})
}

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
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const discount = await prisma.discount.findUnique({
		where: { id: params.discountId, businessId },
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

	await updateDiscountValidity(discount)

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
		},
	})
}

export default function DiscountRoute() {
	const isAdmin = true
	const { discount } = useLoaderData<typeof loader>()
	const discountValidPeriod = formatDistance(
		new Date(discount.validFrom),
		new Date(discount.validUntil),
		{ locale: es, includeSeconds: true },
	)
	const formattedDates = `${format(
		new Date(discount.validFrom),
		"dd 'de' MMMM 'del' yyyy",
		{ locale: es },
	)} -- ${format(new Date(discount.validUntil), "dd 'de' MMMM 'del' yyyy", {
		locale: es,
	})}`

	//Amount of items at which the height for the card container with the associated items becomes fixed.
	const MAX_ITEMS_BEFORE_OVERFLOW = 14

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

				{isAdmin && (
					<div className="hidden md:flex ">
						<DeleteDiscountConfirmationModal discountId={discount.id} />
					</div>
				)}
			</div>
			<Spacer size="4xs" />

			<div className="grid h-full  gap-4 lg:grid-cols-7 lg:gap-6 2xl:grid-cols-3">
				<div className="col-span-3 grid auto-rows-max items-start gap-4 lg:col-span-4 lg:gap-6 2xl:col-span-2 ">
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
								isEditable={isAdmin}
								editModal={
									<DiscountDescriptionEditModal
										id={discount.id}
										icon={'id-badge-2'}
										label={'Descripción'}
										value={discount.description}
									/>
								}
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
								icon="id"
								label="Método de aplicación"
								value={
									discount.applicationMethod ===
									DiscountApplicationMethod.BY_ITEM
										? discountAppmethodNames[DiscountApplicationMethod.BY_ITEM]
										: discountAppmethodNames[DiscountApplicationMethod.TO_TOTAL]
								}
								isEditable={isAdmin}
								editModal={
									<DiscountAppmethodEditModal
										id={discount.id}
										icon={'id-badge-2'}
										label={'Método de aplicación'}
										value={discount.applicationMethod}
									/>
								}
							/>
							<DataRow
								icon="id"
								label="Tipo de descuento"
								value={
									discount.type === DiscountType.FIXED
										? discountTypeNames[DiscountType.FIXED]
										: discountTypeNames[DiscountType.PERCENTAGE]
								}
								isEditable={isAdmin}
								editModal={
									<DiscountTypeEditModal
										id={discount.id}
										icon={'id-badge-2'}
										label={'Tipo de descuento'}
										value={discount.type}
									/>
								}
							/>
							<DataRow
								icon="checklist"
								label="Cantidad minima requerida"
								value={discount.minimumQuantity}
								suffix={`${
									discount.minimumQuantity !== 1 ? 'unidades' : 'unidad'
								}.`}
								isEditable={isAdmin}
								editModal={
									<DiscountMinquantityEditModal
										id={discount.id}
										icon={'id-badge-2'}
										label={'Cantidad Minima'}
										value={discount.minimumQuantity}
									/>
								}
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
								isEditable={isAdmin}
								editModal={
									<DiscountValueEditModal
										id={discount.id}
										icon={'id-badge-2'}
										label={'Valor del descuento'}
										value={discount.value}
									/>
								}
							/>
							<DataRow
								icon="id-badge-2"
								label={`Periodo de validez ${
									discount.isActive ? '' : '(CADUCADO)'
								}`}
								value={formattedDates}
								suffix={`| [ ${discountValidPeriod} ]`}
								className="overflow-auto whitespace-normal normal-case tracking-normal 2xl:col-span-2"
								isEditable={isAdmin}
								editModal={
									<DiscountValidperiodEditModal
										id={discount.id}
										icon={'id-badge-2'}
										label={'Fecha inicio'}
										value={formattedDates}
									/>
								}
							/>
						</CardContent>
					</Card>
				</div>
				<div className="col-span-3 grid auto-rows-max items-start gap-4 lg:gap-6 2xl:col-span-1">
					<Card className="">
						<CardHeader>
							<CardTitle>
								<span>Artículos asociados</span>{' '}
								{discount.scope !== DiscountScope.GLOBAL ? (
									<span className="text-md tracking-wide text-muted-foreground">
										({discount.items.length})
									</span>
								) : null}
							</CardTitle>
							<CardDescription>
								{discount.scope === DiscountScope.GLOBAL
									? 'Descuento Global. Aplicado a todos los artículos registrados en sistema.'
									: 'Lista de artículos asociados al descuento.'}
							</CardDescription>
						</CardHeader>
						{discount.scope !== DiscountScope.GLOBAL ? (
							<CardContent>
								<ScrollArea
									className={cn(
										'h-fit rounded-sm p-3',
										discount.items.length >= MAX_ITEMS_BEFORE_OVERFLOW &&
											'h-[41rem]',
									)}
								>
									<DiscountItemsList
										addedItems={discount.items}
										canRemove={false}
										showDetailsLink
									/>
								</ScrollArea>
							</CardContent>
						) : null}
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
