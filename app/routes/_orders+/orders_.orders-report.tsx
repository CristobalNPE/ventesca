import { getBusinessId, requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency } from '#app/utils/misc.tsx'
import {
	Document,
	Page,
	StyleSheet,
	Text,
	View,
	renderToStream,
} from '@react-pdf/renderer'
import { type LoaderFunctionArgs } from '@remix-run/server-runtime'
import {
	endOfMonth,
	endOfToday,
	endOfWeek,
	endOfYear,
	format,
	startOfMonth,
	startOfToday,
	startOfWeek,
	startOfYear,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { pdf } from 'remix-utils/responses'
import { OrderStatus } from '../order+/_types/order-status.ts'
import { TimePeriod } from './orders.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const url = new URL(request.url)

	const periodFilter = url.searchParams.get('period')?.toLowerCase()
	const sellerFilter = url.searchParams.get('seller')

	let startDate: Date | null
	let endDate: Date | null

	switch (periodFilter) {
		case TimePeriod.TODAY:
			startDate = startOfToday()
			endDate = endOfToday()
			break
		case TimePeriod.LAST_WEEK:
			startDate = startOfWeek(new Date(), { weekStartsOn: 1 })
			endDate = endOfWeek(new Date(), { weekStartsOn: 1 })
			break
		case TimePeriod.LAST_MONTH:
			startDate = startOfMonth(new Date())
			endDate = endOfMonth(new Date())
			break
		case TimePeriod.LAST_YEAR:
			startDate = startOfYear(new Date())
			endDate = endOfYear(new Date())
			break
		default:
			startDate = null
			endDate = null
			break
	}

	const businessName = await prisma.business.findUniqueOrThrow({
		where: { id: businessId },
		select: { name: true },
	})

	const ordersReportData = await prisma.order.findMany({
		where: {
			businessId,
			status: OrderStatus.FINISHED,
			...(startDate &&
				endDate && { completedAt: { gte: startDate, lte: endDate } }),
			...(sellerFilter && { sellerId: sellerFilter }),
		},
		select: {
			id: true,
			seller: { select: { name: true } },
			total: true,
			directDiscount: true,
			totalDiscount: true,
			paymentMethod: true,
			completedAt: true,
			subtotal: true,
		},

		orderBy: { completedAt: 'desc' },
	})

	let stream = await renderToStream(
		<OrdersReport
			data={ordersReportData}
			startDate={startDate}
			endDate={endDate}
			businessName={businessName.name}
		/>,
	)

	let body: Buffer = await new Promise((resolve, reject) => {
		let buffers: Uint8Array[] = []
		stream.on('data', data => {
			buffers.push(data)
		})
		stream.on('end', () => {
			resolve(Buffer.concat(buffers))
		})
		stream.on('error', reject)
	})

	return pdf(body)
}

const styles = StyleSheet.create({
	page: {
		padding: 30,
		fontFamily: 'Helvetica',
	},
	title: {
		marginBottom: 20,
		display: 'flex',
	},
	titleText: {
		marginBottom: 4,
		fontFamily: 'Helvetica-Bold',
		fontSize: 24,
		textAlign: 'center',
		fontWeight: 'black',
	},
	header: {
		marginBottom: 20,
	},
	headerSection: {
		display: 'flex',
		flexDirection: 'row',
		marginBottom: 4,
	},
	headerText: {
		fontSize: 12,
		textTransform: 'uppercase',
	},
	headerTextTitle: {
		width: 160,
		fontSize: 12,
		marginBottom: 4,
		fontFamily: 'Helvetica-Bold',
	},
	footer: {
		marginVertical: 40,
		display: 'flex',
		gap: 4,
		alignItems: 'flex-end',
	},
	footerTextTitle: {
		fontFamily: 'Helvetica-Bold',
	},

	footerSection: {
		display: 'flex',
		flexDirection: 'row',
		fontSize: 18,
		fontFamily: 'Helvetica',
	},
	footerText: {
		width: 150,
		fontFamily: 'Helvetica',
		textAlign: 'right',
	},
	table: {
		display: 'flex',
		width: 'auto',
		borderStyle: 'solid',
		borderWidth: 1,
		borderRightWidth: 0,
		borderBottomWidth: 0,
	},
	tableRow: {
		flexDirection: 'row',
	},
	tableRowHeader: {
		flexDirection: 'row',
		backgroundColor: 'lightgray',
	},
	tableCol: {
		width: '12.5%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0,
		padding: 5,
	},
	idTableCol: {
		width: '15%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0,
		padding: 5,
		textTransform: 'uppercase',
	},
	nameTableCol: {
		textOverflow: 'ellipsis',
		overflow: 'hidden',
		width: '25%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0,
		padding: 5,
		textTransform: 'uppercase',
	},
	tableCell: {
		fontSize: 8,
	},
})
const OrdersReport = ({
	data,
	businessName,
	startDate,
	endDate,
}: {
	data: any
	businessName: string
	startDate: Date | null
	endDate: Date | null
}) => (
	<Document title={`${businessName} - Reporte Transacciones Finalizadas`}>
		<Page size="A4" style={styles.page}>
			<View style={styles.title}>
				<Text style={styles.titleText}>{businessName}</Text>
				<Text style={styles.titleText}>
					Reporte de Transacciones Finalizadas
				</Text>
			</View>

			<View style={styles.header}>
				<View style={styles.headerSection}>
					<Text style={styles.headerTextTitle}>Fecha:</Text>
					<Text style={styles.headerText}>
						{format(new Date(), "dd 'de' MMMM 'del' yyyy", {
							locale: es,
						})}
					</Text>
				</View>
				<View style={styles.headerSection}>
					<Text style={styles.headerTextTitle}>Período:</Text>{' '}
					{startDate && endDate ? (
						<Text style={styles.headerText}>
							{format(new Date(startDate), "dd'/'MM'/'yyyy", {
								locale: es,
							})}{' '}
							-{' '}
							{format(new Date(endDate), "dd'/'MM'/'yyyy", {
								locale: es,
							})}
						</Text>
					) : (
						<Text style={styles.headerText}>Todos los registros</Text>
					)}
				</View>
				<View style={styles.headerSection}>
					<Text style={styles.headerTextTitle}>Nro. transacciones:</Text>{' '}
					<Text style={styles.headerText}>
						{data.length} transacciones finalizadas.
					</Text>
				</View>
			</View>

			<View style={styles.table}>
				<View style={styles.tableRowHeader}>
					<View style={styles.idTableCol}>
						<Text style={styles.tableCell}>ID</Text>
					</View>

					<View style={styles.nameTableCol}>
						<Text style={styles.tableCell}>Vendedor</Text>
					</View>
					<View style={styles.tableCol}>
						<Text style={styles.tableCell}>Fecha ingreso</Text>
					</View>
					<View style={styles.tableCol}>
						<Text style={styles.tableCell}>Metodo pago</Text>
					</View>

					<View style={styles.tableCol}>
						<Text style={styles.tableCell}>Subtotal</Text>
					</View>
					<View style={styles.tableCol}>
						<Text style={styles.tableCell}>Descuento</Text>
					</View>
					<View style={styles.tableCol}>
						<Text style={styles.tableCell}>Total</Text>
					</View>
				</View>
				{data.map(order => (
					<View key={order.id} style={styles.tableRow}>
						<View style={styles.idTableCol}>
							<Text style={styles.tableCell}>{order.id.slice(-10)}</Text>
						</View>

						<View style={styles.nameTableCol}>
							<Text style={styles.tableCell}>{order.seller.name}</Text>
						</View>
						<View style={styles.tableCol}>
							<Text style={styles.tableCell}>
								{format(new Date(order.completedAt), "dd'/'MM'/'yyyy", {
									locale: es,
								})}
							</Text>
						</View>
						<View style={styles.tableCol}>
							<Text style={styles.tableCell}>{order.paymentMethod}</Text>
						</View>

						<View style={styles.tableCol}>
							<Text style={styles.tableCell}>
								{formatCurrency(order.subtotal)}
							</Text>
						</View>
						<View style={styles.tableCol}>
							<Text style={styles.tableCell}>
								{formatCurrency(order.totalDiscount + order.directDiscount)}
							</Text>
						</View>
						<View style={styles.tableCol}>
							<Text style={styles.tableCell}>
								{formatCurrency(order.total)}
							</Text>
						</View>
					</View>
				))}
			</View>
			<View style={styles.footer}>
				<View style={styles.footerSection}>
					<Text style={styles.footerTextTitle}>Total Ingresos:</Text>
					<Text style={styles.footerText}>
						{formatCurrency(data.reduce((acc, order) => acc + order.total, 0))}{' '}
						CLP
					</Text>
				</View>
			</View>
		</Page>
	</Document>
)
