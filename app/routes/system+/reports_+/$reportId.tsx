import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { format, formatDistance, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
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
import { formatCurrency, invariantResponse } from '#app/utils/misc.tsx'
import { TRANSACTION_STATUS_COMPLETED } from '../sell.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const transactionReport = await prisma.transaction.findUnique({
		where: { id: params.reportId },
		select: {
			id: true,
			status: true,
			paymentMethod: true,
			createdAt: true,
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

	return (
		<>
			<div>
				<div className="flex items-center gap-4 text-2xl">
					<h1>Reporte de Transacción</h1>
					<span className="rounded-md bg-secondary p-1 text-lg uppercase">
						ID: {transactionReport.id}
					</span>
				</div>
				<div className="flex items-center gap-2 text-foreground/80">
					<Icon name="clock" />
					<span className="">
						Creado el{' '}
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
				<div className="flex flex-col">
					<span>Estado: {transactionReport.status}</span>
					<span>
						Ingreso Total: {formatCurrency(transactionReport.total)}{' '}
						<span className='tracking-wider'>
							[
							{transactionReport.status !== TRANSACTION_STATUS_COMPLETED &&
								'Sin Completar'}
							]
						</span>
					</span>
					<span>Tipo de pago: {transactionReport.paymentMethod}</span>
					<span>
						Vendedor:{' '}
						{transactionReport.seller
							? transactionReport.seller.name
							: 'Sin Definir'}
					</span>
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
								<TableCell>{itemTransaction.item?.name}</TableCell>
								<TableCell>{itemTransaction.quantity}</TableCell>
								<TableCell>{itemTransaction.type}</TableCell>
								<TableCell className="text-right">
									{formatCurrency(itemTransaction.totalPrice)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</>
	)
}
