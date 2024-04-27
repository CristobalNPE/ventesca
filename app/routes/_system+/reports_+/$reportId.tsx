import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { format, formatDistance, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency, invariantResponse } from '#app/utils/misc.tsx'
import {
	TRANSACTION_STATUS_COMPLETED,
	TRANSACTION_STATUS_DISCARDED,
	TRANSACTION_STATUS_PENDING,
	type TransactionStatus,
	TransactionStatusSchema,

} from '../transaction+/index.tsx'
import {
	PaymentMethod,
	PaymentMethodSchema,
} from '../transaction+/_types/payment-method.ts'
import { ConfirmDeleteTransaction } from '../transaction+/transaction-panel.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const transactionReport = await prisma.transaction.findUnique({
		where: { id: params.reportId },
		select: {
			id: true,
			status: true,
			paymentMethod: true,
			createdAt: true,
			completedAt: true,
			total: true,
			seller: { select: { name: true } },
			items: {
				select: {
					id: true,
					quantity: true,
					type: true,
					totalPrice: true,
					item: { select: { code: true, name: true } },
				},
			},
		},
	})

	invariantResponse(transactionReport, 'Not found', { status: 404 })
	return json({ transactionReport })
}

export default function ReportRoute() {
	const { transactionReport } = useLoaderData<typeof loader>()

	const transactionStatus = TransactionStatusSchema.parse(
		transactionReport.status,
	)
	const paymentMethod = PaymentMethodSchema.parse(
		transactionReport.paymentMethod,
	)

	const shouldShowCompletedAt =
		transactionReport.completedAt !== transactionReport.createdAt
	return (
		<div>
			<div className="flex max-w-[40rem] flex-col">
				<div className="flex flex-col items-center justify-between text-2xl md:flex-row">
					<h1>Reporte de Transacción</h1>
					<TransactionIdCard
						id={transactionReport.id}
						status={transactionStatus}
					/>
				</div>
				<div className="relative mt-2 flex w-full flex-col rounded-md bg-secondary p-2 pl-12 text-foreground/80">
					<Icon
						name="clock"
						className={cn(
							'absolute left-3 top-4',
							!shouldShowCompletedAt && 'top-2',
						)}
						size={shouldShowCompletedAt ? 'xl' : 'lg'}
					/>
					<div className="flex items-center gap-2">
						<span className="">
							Iniciada el{' '}
							{format(
								new Date(transactionReport.createdAt),
								"eeee d 'de' MMMM', a las 'HH:mm' hrs.'",
								{ locale: es },
							)}
						</span>
						<span>
							(
							{formatDistance(
								subDays(new Date(transactionReport.createdAt), 0),
								new Date(),
								{
									locale: es,
									addSuffix: true,
								},
							)}
							)
						</span>
					</div>
					{shouldShowCompletedAt && (
						<span className="font-bold">
							{transactionReport.status === TRANSACTION_STATUS_DISCARDED
								? 'Cancelada el  '
								: 'Completada el '}
							{format(
								new Date(transactionReport.completedAt),
								"eeee d 'de' MMMM', a las 'HH:mm' hrs.'",
								{ locale: es },
							)}
						</span>
					)}
				</div>
				<div className="my-4 flex items-center justify-between gap-4">
					<div className="flex flex-col gap-2">
						{transactionReport.status === TRANSACTION_STATUS_COMPLETED && (
							<TransactionTotalCard total={transactionReport.total} />
						)}
						<TransactionPaymentMethodCard paymentMethod={paymentMethod} />
						{transactionReport.seller && (
							<TransactionSellerCard
								userName={transactionReport.seller.name ?? 'Sin Definir'}
							/>
						)}
					</div>
					<TransactionStatusCard status={transactionStatus} />
				</div>
			</div>

			<Table className="bg-secondary/40">
				<TableCaption>Lista de artículos en la transacción.</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead className="w-[100px]">Código</TableHead>
						<TableHead>Nombre / Descripción</TableHead>
						<TableHead>Cantidad</TableHead>
						<TableHead className="w-[150px]">Tipo Transacción</TableHead>
						<TableHead className="text-right">Valor Total</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{transactionReport.items.map(itemTransaction => (
						<TableRow key={itemTransaction.id}>
							<TableCell className="font-medium">
								{itemTransaction.item?.code}
							</TableCell>
							<TableCell className="uppercase">
								{itemTransaction.item?.name}
							</TableCell>
							<TableCell>{itemTransaction.quantity}</TableCell>
							<TableCell>{itemTransaction.type}</TableCell>
							<TableCell className="text-right">
								{formatCurrency(itemTransaction.totalPrice)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
			<div className="mt-4 flex justify-end gap-4">
				{transactionReport.status === TRANSACTION_STATUS_PENDING && (
					<ConfirmDeleteTransaction transactionId={transactionReport.id} />
				)}
				<Button asChild variant={'outline'}>
					<Link target="_blank" reloadDocument to={'report-pdf'}>
						<Icon name="report-money" className="mr-2" />
						Generar Reporte
					</Link>
				</Button>
			</div>
		</div>
	)
}

const TransactionStatusCard = ({ status }: { status: TransactionStatus }) => {
	return (
		<div
			className={cn(
				'flex size-28 flex-col items-center justify-center gap-2 rounded-md p-2 uppercase tracking-tight',
				status === TRANSACTION_STATUS_COMPLETED && 'bg-primary/50',
				status === TRANSACTION_STATUS_PENDING && 'bg-orange-400/50',
				status === TRANSACTION_STATUS_DISCARDED && 'bg-destructive/50',
			)}
		>
			<div className="text-6xl">
				{status === TRANSACTION_STATUS_COMPLETED && <Icon name="checks" />}
				{status === TRANSACTION_STATUS_PENDING && <Icon name="update" />}
				{status === TRANSACTION_STATUS_DISCARDED && <Icon name="cross-1" />}
			</div>
			{status}
		</div>
	)
}

const TransactionIdCard = ({
	id,
	status,
}: {
	id: string
	status: TransactionStatus
}) => {
	return (
		<div
			className={cn(
				'shrink-0  rounded-md p-1 text-lg uppercase',
				status === TRANSACTION_STATUS_COMPLETED && 'bg-primary/10',
				status === TRANSACTION_STATUS_PENDING && 'bg-orange-400/10',
				status === TRANSACTION_STATUS_DISCARDED && 'bg-destructive/10',
			)}
		>
			ID: {id}
		</div>
	)
}

const TransactionTotalCard = ({ total }: { total: number }) => {
	return (
		<div className="flex w-fit items-center justify-center gap-2  text-lg">
			<Icon className="flex-none" size="lg" name="circle-dollar-sign" />
			<div className="flex gap-2">
				<span className="w-[10rem]">
					{total >= 0 ? 'Ingreso Total:' : 'Devolución Total:'}
				</span>
				<span className="font-bold ">{formatCurrency(total)}</span>{' '}
			</div>
		</div>
	)
}

const TransactionPaymentMethodCard = ({
	paymentMethod,
}: {
	paymentMethod: PaymentMethod
}) => {
	return (
		<div className="flex w-fit items-center justify-center gap-2  text-lg">
			<Icon className="flex-none" size="lg" name="banknote" />
			<div className="flex gap-2">
				<span className="w-[10rem]">Método de pago:</span>
				<span className="font-bold uppercase tracking-tight">
					{paymentMethod}
				</span>
			</div>
		</div>
	)
}

const TransactionSellerCard = ({ userName }: { userName: string }) => {
	return (
		<div className="flex w-fit items-center justify-center gap-2  text-lg">
			<Icon className="flex-none" size="lg" name="user" />
			<div className="flex gap-2">
				<span className="w-[10rem]">Vendedor:</span>
				<span className="font-bold ">{userName}</span>
			</div>
		</div>
	)
}
