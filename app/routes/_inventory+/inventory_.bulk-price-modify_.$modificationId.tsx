import { invariant, invariantResponse } from '@epic-web/invariant'
import { type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/node'
import { Form, json, useLoaderData } from '@remix-run/react'

import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
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
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency, useIsPending } from '#app/utils/misc.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { BulkPriceModificationDirection } from '../../types/inventory/BulkPriceModificationDirection'
import { BulkPriceModificationScope } from '../../types/inventory/BulkPriceModificationScope'
import { BulkPriceModificationStatus } from '../../types/inventory/BulkPriceModificationStatus'
import { BulkPriceModificationStrategy } from '../../types/inventory/BulkPriceModificationStrategy'
import { PriceModificationStatus } from '../../types/inventory/PriceModificationStatus'
import { getInventoryValueByCategory } from '#app/services/inventory/inventory-analysis.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const bulkPriceModification = await prisma.bulkPriceModification.findUnique({
		where: { id: params.modificationId, businessId },
		select: {
			executedBy: true,
			executedAt: true,
			revertedAt: true,
			revertedBy: true,
			id: true,
			scope: true,
			adjustmentValue: true,
			affectedProductsCount: true,
			strategy: true,
			status: true,
			direction: true,
			reason: true,
			previousPriceSnapshot: true,
		},
	})
	const priceModifications = await prisma.priceModification.findMany({
		where: { bulkPriceModificationId: bulkPriceModification?.id },
		select: {
			id: true,
			status: true,
			productAnalytics: {
				select: {
					product: { include: { category: { select: { description: true } } } },
				},
			},
			oldPrice: true,
			newPrice: true,
		},
	})

	const totalSellingPriceDifference = priceModifications.reduce(
		(acc, priceModification) => {
			return (
				acc +
				Math.abs(priceModification.oldPrice - priceModification.newPrice) *
					priceModification.productAnalytics.product.stock
			)
		},
		0,
	)

	invariantResponse(bulkPriceModification, 'Not Found', { status: 404 })

	const inventoryValue = await getInventoryValueByCategory(businessId)
	const executedBy = await prisma.user.findUnique({
		where: { businessId, id: bulkPriceModification.executedBy },
		select: { name: true, username: true },
	})

	const newTotalSellingValue =
		bulkPriceModification.direction === BulkPriceModificationDirection.INCREASE
			? inventoryValue.overallTotals.totalSellingValue +
				totalSellingPriceDifference
			: inventoryValue.overallTotals.totalSellingValue -
				totalSellingPriceDifference

	const newPotentialProfit =
		bulkPriceModification.direction === BulkPriceModificationDirection.INCREASE
			? inventoryValue.overallTotals.potentialProfit +
				totalSellingPriceDifference
			: inventoryValue.overallTotals.potentialProfit -
				totalSellingPriceDifference

	return json({
		bulkPriceModification,
		priceModifications,
		totalSellingValue: inventoryValue.overallTotals.totalSellingValue,
		newTotalSellingValue,
		potentialProfit: inventoryValue.overallTotals.potentialProfit,
		newPotentialProfit,
		executedBy,
	})
}

const executeBulkPriceModificationActionIntent =
	'execute-bulk-price-modification'
const cancelBulkPriceModificationActionIntent = 'cancel-bulk-price-modification'
const revertBulkPriceModificationActionIntent = 'revert-bulk-price-modification'

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const formData = await request.formData()
	const intent = formData.get('intent')

	invariantResponse(intent, 'Intent should be defined.')

	switch (intent) {
		case executeBulkPriceModificationActionIntent:
			return await executeBulkPriceModificationAction({ formData, userId })
		case cancelBulkPriceModificationActionIntent:
			return await cancelBulkPriceModificationAction({ formData })
		case revertBulkPriceModificationActionIntent:
			return await revertBulkPriceModificationAction({ formData, userId })
		default:
			throw new Error('Invalid Intent')
	}

	//Action: Remove and add single product modification
	//either remove or add one of the modifications in the list
}

export default function BulkPriceModification() {
	const {
		bulkPriceModification,
		priceModifications,
		totalSellingValue,
		newTotalSellingValue,
		potentialProfit,
		newPotentialProfit,
		executedBy,
	} = useLoaderData<typeof loader>()

	const previousPriceSnapshot: PriceModification[] | null =
		bulkPriceModification.previousPriceSnapshot
			? (JSON.parse(
					bulkPriceModification.previousPriceSnapshot,
				) as PriceModification[])
			: null

	const priceModificationsToDisplay =
		bulkPriceModification.status === BulkPriceModificationStatus.PENDING
			? priceModifications
			: previousPriceSnapshot ?? priceModifications

	return (
		<main className="flex h-full flex-col gap-4 ">
			<div className="flex flex-col items-center  gap-4 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
				<h1 className="text-xl font-semibold">
					Modificación de precio en lote
				</h1>
			</div>
			<div className="grid flex-1 grid-cols-1 gap-12 md:grid-cols-3 ">
				<div className="col-span-1  flex flex-col gap-3">
					<DataCard
						icon="id-badge-2"
						label="ID modificación"
						content={bulkPriceModification.id.toUpperCase()}
					/>
					<DataCard
						icon={
							bulkPriceModification.status ===
							BulkPriceModificationStatus.PENDING
								? 'clock'
								: bulkPriceModification.status ===
									  BulkPriceModificationStatus.EXECUTED
									? 'circle-check'
									: bulkPriceModification.status ===
										  BulkPriceModificationStatus.REVERTED
										? 'reset'
										: 'dots-horizontal'
						}
						label={'Estado'}
						content={
							bulkPriceModification.status ===
							BulkPriceModificationStatus.PENDING
								? 'Pendiente'
								: bulkPriceModification.status ===
									  BulkPriceModificationStatus.EXECUTED
									? 'Ejecutada'
									: bulkPriceModification.status ===
										  BulkPriceModificationStatus.REVERTED
										? 'Revertida'
										: 'Desconocido'
						}
					/>
					<DataCard
						icon={
							bulkPriceModification.scope ===
							BulkPriceModificationScope.INVENTORY
								? 'package'
								: bulkPriceModification.scope ===
									  BulkPriceModificationScope.CATEGORY
									? 'shapes'
									: 'check'
						}
						label={'Alcance'}
						content={
							bulkPriceModification.scope ===
							BulkPriceModificationScope.INVENTORY
								? 'Totalidad del inventario'
								: bulkPriceModification.scope ===
									  BulkPriceModificationScope.CATEGORY
									? 'Categorías seleccionadas'
									: 'Sin definir'
						}
					/>

					<DataCard
						icon={'shopping-bag'}
						label={'Productos afectados'}
						content={`${bulkPriceModification.affectedProductsCount} ${bulkPriceModification.affectedProductsCount === 1 ? 'producto' : 'productos'}`}
					/>

					<DataCard
						icon={
							bulkPriceModification.strategy ===
							BulkPriceModificationStrategy.FIXED_AMOUNT
								? 'cash'
								: bulkPriceModification.strategy ===
									  BulkPriceModificationStrategy.PERCENTAGE
									? 'circle-percentage'
									: 'moneybag'
						}
						label={'Tipo de modificación'}
						content={
							bulkPriceModification.strategy ===
							BulkPriceModificationStrategy.FIXED_AMOUNT
								? 'Monto Fijo'
								: bulkPriceModification.strategy ===
									  BulkPriceModificationStrategy.PERCENTAGE
									? 'Porcentual'
									: 'Sin definir'
						}
					/>

					<DataCard
						icon={
							bulkPriceModification.direction ===
							BulkPriceModificationDirection.INCREASE
								? 'trending-up'
								: bulkPriceModification.direction ===
									  BulkPriceModificationDirection.DECREASE
									? 'trending-down'
									: 'dots-horizontal'
						}
						label={'Dirección de modificación'}
						content={
							bulkPriceModification.direction ===
							BulkPriceModificationDirection.INCREASE
								? 'Incremento'
								: bulkPriceModification.direction ===
									  BulkPriceModificationDirection.DECREASE
									? 'Disminución'
									: 'Sin definir'
						}
					/>
					<DataCard
						icon={
							bulkPriceModification.strategy ===
							BulkPriceModificationStrategy.FIXED_AMOUNT
								? 'currency-dollar'
								: bulkPriceModification.strategy ===
									  BulkPriceModificationStrategy.PERCENTAGE
									? 'percentage'
									: 'moneybag'
						}
						label={'Valor de modificación'}
						content={
							bulkPriceModification.strategy ===
							BulkPriceModificationStrategy.FIXED_AMOUNT
								? formatCurrency(bulkPriceModification.adjustmentValue)
								: bulkPriceModification.strategy ===
									  BulkPriceModificationStrategy.PERCENTAGE
									? `${bulkPriceModification.adjustmentValue}%`
									: 'Sin definir'
						}
					/>

					{bulkPriceModification.status ===
						BulkPriceModificationStatus.EXECUTED &&
					bulkPriceModification.executedAt &&
					executedBy ? (
						<>
							<DataCard
								icon="circle-check"
								label={'Fecha de ejecución'}
								content={format(
									bulkPriceModification.executedAt,
									"d'-'MM'-'yyyy  HH:mm:ss",
									{
										locale: es,
									},
								)}
							/>
							<DataCard
								icon="circle-check"
								label={'Ejecutado por'}
								content={executedBy.name ?? executedBy.username}
							/>
						</>
					) : null}

					<div>{bulkPriceModification.reason}</div>

					{bulkPriceModification.status === 'REVERTED' ? (
						<div>
							<div>{bulkPriceModification.revertedBy}</div>
							<div>{bulkPriceModification.revertedAt}</div>
						</div>
					) : null}
				</div>
				<div className="col-span-2 ">
					<div className="flex h-full flex-col justify-between gap-4">
						<Card className="relative h-[37rem] overflow-y-auto">
							<CardHeader>
								<CardTitle>Productos incluidos en la modificación</CardTitle>
								{bulkPriceModification.status ===
								BulkPriceModificationStatus.PENDING ? (
									<CardDescription>
										Marque o desmarque productos de manera individual para
										incluirlos en la modificación.
									</CardDescription>
								) : null}
							</CardHeader>
							<CardContent>
								<Table className="bg-card">
									<TableHeader className="sticky top-0 z-20 bg-card">
										<TableRow>
											{bulkPriceModification.status ===
											BulkPriceModificationStatus.PENDING ? (
												<TableHead className="w-[50px] ">Incluir</TableHead>
											) : null}
											<TableHead className="">Nombre / Código</TableHead>
											<TableHead className="hidden sm:table-cell">
												Categoría
											</TableHead>
											<TableHead className="hidden text-right sm:table-cell">
												Costo
											</TableHead>
											<TableHead className="text-right">
												P. Venta actual
											</TableHead>
											<TableHead className="text-right">
												P. Venta modificado
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{priceModificationsToDisplay.map(priceModifications => (
											<TableRow className="group" key={priceModifications.id}>
												{bulkPriceModification.status ===
												BulkPriceModificationStatus.PENDING ? (
													<TableCell className=" text-center ">
														{/* Might hold the id of the modification as a value, on CLick should either add the modification, or delete it. */}
														<input type="checkbox" />
													</TableCell>
												) : null}
												<TableCell>
													<div>
														<p className="font-semibold leading-none">
															{priceModifications.productAnalytics.product.name}
														</p>
														<div className="flex items-center gap-1 text-muted-foreground">
															<Icon name="scan-barcode" />
															<span>
																{
																	priceModifications.productAnalytics.product
																		.code
																}
															</span>
														</div>
													</div>
												</TableCell>
												<TableCell className="hidden sm:table-cell">
													<Badge variant={'secondary'}>
														{
															priceModifications.productAnalytics.product
																.category.description
														}
													</Badge>
												</TableCell>
												<TableCell className="hidden text-right sm:table-cell">
													{formatCurrency(
														priceModifications.productAnalytics.product.cost,
													)}
												</TableCell>
												<TableCell className="text-right text-muted-foreground line-through group-hover:no-underline ">
													{formatCurrency(priceModifications.oldPrice)}
												</TableCell>
												<TableCell
													className={cn(
														'hidden text-right font-bold text-destructive transition-transform group-hover:scale-110 sm:table-cell',
														priceModifications.newPrice >
															priceModifications.oldPrice && 'text-green-600',
													)}
												>
													{formatCurrency(priceModifications.newPrice)}
													<Icon
														className="ml-2"
														name={
															priceModifications.newPrice >
															priceModifications.oldPrice
																? 'trending-up'
																: 'trending-down'
														}
													/>
												</TableCell>
												<TableCell
													className={cn(
														'table-cell text-right font-bold text-destructive transition-transform group-hover:scale-110 sm:hidden',
														priceModifications.newPrice >
															priceModifications.oldPrice && 'text-green-600',
													)}
												>
													{formatCurrency(priceModifications.newPrice)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>

						{bulkPriceModification.status ===
						BulkPriceModificationStatus.PENDING ? (
							<div className="flex flex-col items-center gap-3 ">
								<div className="grid w-full grid-cols-4 place-items-center rounded-md border bg-card p-2 sm:grid-cols-3">
									<div className="col-span-4 text-xl text-muted-foreground sm:col-span-1">
										Valor potencial total
									</div>
									<div className="col-span-2 flex gap-4 text-2xl text-muted-foreground sm:col-span-1">
										<span>{formatCurrency(totalSellingValue)}</span>
										<Icon name="arrow-right" />
									</div>
									<div className="col-span-2 flex gap-4 text-2xl font-bold sm:col-span-1">
										<span>{formatCurrency(newTotalSellingValue)}</span>
										<Icon
											name={
												newTotalSellingValue > totalSellingValue
													? 'arrow-up'
													: 'arrow-down'
											}
											className={cn(
												'text-foreground',
												newTotalSellingValue > totalSellingValue &&
													'text-green-600',
												totalSellingValue > newTotalSellingValue &&
													'text-destructive',
											)}
										/>
									</div>
								</div>
								<div className="grid w-full grid-cols-4 place-items-center rounded-md border bg-card p-2 sm:grid-cols-3">
									<div className="col-span-4 text-xl text-muted-foreground sm:col-span-1">
										Ganancia potencial total
									</div>
									<div className="col-span-2 flex gap-4 text-2xl text-muted-foreground sm:col-span-1">
										<span>{formatCurrency(potentialProfit)}</span>
										<Icon name="arrow-right" />
									</div>
									<div className=" col-span-2 flex gap-4 text-2xl font-bold sm:col-span-1">
										<span>{formatCurrency(newPotentialProfit)}</span>
										<Icon
											name={
												newPotentialProfit > potentialProfit
													? 'arrow-up'
													: 'arrow-down'
											}
											className={cn(
												'text-foreground',
												newPotentialProfit > potentialProfit &&
													'text-green-600',
												potentialProfit > newPotentialProfit &&
													'text-destructive',
											)}
										/>
									</div>
								</div>
							</div>
						) : null}
					</div>
				</div>
			</div>
			<Spacer size="4xs" />
			<div className="flex justify-end">
				{bulkPriceModification.status ===
				BulkPriceModificationStatus.PENDING ? (
					<div className="flex flex-col  gap-4 sm:flex-row  ">
						<CancelModificationDialog
							bulkPriceModificationId={bulkPriceModification.id}
						/>
						<ExecuteModificationDialog
							bulkPriceModificationId={bulkPriceModification.id}
						/>
					</div>
				) : null}
				{bulkPriceModification.status ===
				BulkPriceModificationStatus.EXECUTED ? (
					<RevertModificationDialog
						bulkPriceModificationId={bulkPriceModification.id}
						bulkPriceModificationExecutedDate={
							new Date(bulkPriceModification.executedAt!)
						}
					/>
				) : null}
			</div>
		</main>
	)
}

function DataCard({
	icon,
	label,
	content,
}: {
	icon: IconName
	label: string
	content: string
}) {
	return (
		<div className="flex gap-4  p-2 ">
			<Icon name={icon} className="shrink-0" size="xl" />
			<div>
				<div className="font-semibold text-muted-foreground">{label}</div>
				<div>{content}</div>
			</div>
		</div>
	)
}

function ExecuteModificationDialog({
	bulkPriceModificationId,
}: {
	bulkPriceModificationId: string
}) {
	const isPending = useIsPending()
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button size={'pill'}>Ejecutar Modificación</Button>
			</AlertDialogTrigger>
			<AlertDialogContent className="max-w-xl">
				<AlertDialogHeader>
					<AlertDialogTitle>
						Confirmar modificación masiva de precios
					</AlertDialogTitle>
					<AlertDialogDescription>
						Está a punto de modificar el precio de venta de múltiples artículos
						de forma simultánea. Por favor confirme que desea ejecutar la
						operación.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>

					<Form method="POST">
						<input
							type="hidden"
							name="bulkPriceModificationId"
							value={bulkPriceModificationId}
						/>
						<StatusButton
							iconName="checks"
							type="submit"
							name="intent"
							value={executeBulkPriceModificationActionIntent}
							status={isPending ? 'pending' : 'idle'}
							disabled={isPending}
						>
							<span>{isPending ? 'Actualizando...' : 'Confirmar'}</span>
						</StatusButton>
					</Form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

async function executeBulkPriceModificationAction({
	formData,
	userId,
}: {
	formData: FormData
	userId: string
}) {
	const bulkPriceModificationId = formData.get('bulkPriceModificationId')
	invariant(
		bulkPriceModificationId && typeof bulkPriceModificationId === 'string',
		'Modification ID should be defined',
	)

	return prisma.$transaction(async tx => {
		const bulkPriceModification =
			await tx.bulkPriceModification.findUniqueOrThrow({
				where: { id: bulkPriceModificationId },
				select: {
					executedBy: true,
					executedAt: true,
					revertedAt: true,
					revertedBy: true,
					id: true,
					scope: true,
					adjustmentValue: true,
					affectedProductsCount: true,
					strategy: true,
					status: true,
					direction: true,
					reason: true,
				},
			})

		const priceModifications = await tx.priceModification.findMany({
			where: { bulkPriceModificationId: bulkPriceModification.id },
			select: {
				id: true,
				productAnalytics: {
					select: { id: true, product: { include: { category: true } } },
				},
				oldPrice: true,
				newPrice: true,
			},
		})

		const snapshot = JSON.stringify(priceModifications)

		// Update product prices

		for (const modification of priceModifications) {
			await tx.product.update({
				where: { id: modification.productAnalytics.product.id },
				data: { sellingPrice: modification.newPrice },
			})
		}

		// Update the bulk price modification status
		await tx.bulkPriceModification.update({
			where: { id: bulkPriceModificationId },
			data: {
				status: BulkPriceModificationStatus.EXECUTED,
				executedAt: new Date(),
				executedBy: userId,
				previousPriceSnapshot: snapshot,
			},
		})

		//update status of price modifications
		await tx.priceModification.updateMany({
			where: {
				id: {
					in: priceModifications.map(priceModification => priceModification.id),
				},
			},
			data: {
				status: PriceModificationStatus.APPLIED,
			},
		})

		return redirectWithToast(`/inventory`, {
			type: 'success',
			title: 'Modificación Masiva Ejecutada',
			description: `Se ha aplicado una modificación de precio a ${bulkPriceModification.affectedProductsCount} articulo(s).`,
		})
	})
}
function CancelModificationDialog({
	bulkPriceModificationId,
}: {
	bulkPriceModificationId: string
}) {
	const isPending = useIsPending()
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant={'outline'}>Cancelar Modificación</Button>
			</AlertDialogTrigger>
			<AlertDialogContent className="max-w-xl">
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmar cancelación</AlertDialogTitle>
					<AlertDialogDescription>
						Confirme que desea cancelar la modificación masiva preparada. No se
						aplicarán los cambios.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>

					<Form method="POST">
						<input
							type="hidden"
							name="bulkPriceModificationId"
							value={bulkPriceModificationId}
						/>
						<StatusButton
							iconName="trash"
							variant={'destructive'}
							type="submit"
							name="intent"
							value={cancelBulkPriceModificationActionIntent}
							status={isPending ? 'pending' : 'idle'}
							disabled={isPending}
						>
							<span>
								{isPending ? 'Cancelando...' : 'Cancelar modificación'}
							</span>
						</StatusButton>
					</Form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

async function cancelBulkPriceModificationAction({
	formData,
}: {
	formData: FormData
}) {
	const bulkPriceModificationId = formData.get('bulkPriceModificationId')
	invariant(
		bulkPriceModificationId && typeof bulkPriceModificationId === 'string',
		'Modification ID should be defined',
	)

	await prisma.bulkPriceModification.delete({
		where: { id: bulkPriceModificationId },
	})
	return redirectWithToast(`/inventory`, {
		type: 'message',
		title: 'Modificación Masiva Cancelada',
		description: `Se ha cancelado la modificación masiva.`,
	})
}

function RevertModificationDialog({
	bulkPriceModificationId,
	bulkPriceModificationExecutedDate,
}: {
	bulkPriceModificationId: string
	bulkPriceModificationExecutedDate: Date
}) {
	const isPending = useIsPending()
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button>Revertir Modificación</Button>
			</AlertDialogTrigger>
			<AlertDialogContent className="max-w-2xl">
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmar reversión</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="flex flex-col gap-4">
							<p>
								La reversión de esta modificación restaurará los precios de
								venta de los productos asociados a los valores previos a la
								modificación realizada el{' '}
								{format(
									bulkPriceModificationExecutedDate,
									"d'-'MM'-'yyyy 'a las' HH:mm:ss",
									{
										locale: es,
									},
								)}
							</p>
							<p>
								Para revisar los precios actuales, consulte la columna [P.Venta
								actual].
							</p>
							<p>
								Por favor, confirme si desea proceder con la reversión de la
								modificación masiva. Una vez aplicada, esta modificación se
								cerrará permanentemente.
							</p>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>

					<Form method="POST">
						<input
							type="hidden"
							name="bulkPriceModificationId"
							value={bulkPriceModificationId}
						/>
						<StatusButton
							iconName="update"
							type="submit"
							name="intent"
							value={revertBulkPriceModificationActionIntent}
							status={isPending ? 'pending' : 'idle'}
							disabled={isPending}
						>
							<span>
								{isPending ? 'Restaurando...' : 'Revertir modificación'}
							</span>
						</StatusButton>
					</Form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

async function revertBulkPriceModificationAction({
	formData,
	userId,
}: {
	formData: FormData
	userId: string
}) {
	const bulkPriceModificationId = formData.get('bulkPriceModificationId')
	invariant(
		bulkPriceModificationId && typeof bulkPriceModificationId === 'string',
		'Modification ID should be defined',
	)

	return prisma.$transaction(async tx => {
		const bulkPriceModification =
			await tx.bulkPriceModification.findUniqueOrThrow({
				where: { id: bulkPriceModificationId },
				select: {
					previousPriceSnapshot: true,
					executedBy: true,
					executedAt: true,
					revertedAt: true,
					revertedBy: true,
					id: true,
					scope: true,
					adjustmentValue: true,
					affectedProductsCount: true,
					strategy: true,
					status: true,
					direction: true,
					reason: true,
				},
			})

		invariant(
			bulkPriceModification.previousPriceSnapshot,
			'There is not a valid snapshot for reversion.',
		)

		const priceModifications: PriceModification[] = JSON.parse(
			bulkPriceModification.previousPriceSnapshot,
		) as PriceModification[]

		//Products involved in modification
		const productAnalytics = await tx.productAnalytics.findMany({
			where: {
				id: { in: priceModifications.map(pm => pm.productAnalytics.id) },
			},
			select: { id: true, product: { select: { sellingPrice: true } } },
		})

		//Store new price modifications
		const newPriceModifications = priceModifications.map(modification => ({
			status: PriceModificationStatus.APPLIED,
			oldPrice:
				productAnalytics.find(pa => pa.id === modification.productAnalytics.id)
					?.product.sellingPrice ?? modification.newPrice,
			newPrice: modification.oldPrice,
			productAnalyticsId: modification.productAnalytics.id,
			bulkPriceModificationId: bulkPriceModificationId,
		}))

		await tx.priceModification.createMany({ data: newPriceModifications })

		// Update product prices
		for (const modification of priceModifications) {
			await tx.product.updateMany({
				where: { id: modification.productAnalytics.product.id },
				data: { sellingPrice: modification.oldPrice },
			})
		}

		// Update the bulk price modification status
		await tx.bulkPriceModification.update({
			where: { id: bulkPriceModificationId },
			data: {
				status: BulkPriceModificationStatus.REVERTED,
				revertedAt: new Date(),
				revertedBy: userId,
			},
		})
		return redirectWithToast(`/inventory`, {
			type: 'success',
			title: 'Modificación Masiva Revertida',
			description: `Se ha revertido una modificación de precio masiva a ${bulkPriceModification.affectedProductsCount} articulo(s).`,
		})
	})
}

type PriceModification = {
	id: string
	oldPrice: number
	newPrice: number
	status: PriceModificationStatus
	productAnalytics: {
		id: string
		product: {
			category: {
				description: string
			}
		} & {
			id: string
			name: string
			cost: number
			code: string
			stock: number
		}
	}
}
