import {
	Document,
	Page,
	StyleSheet,
	Text,
	View,
	renderToStream,
} from '@react-pdf/renderer'
import { type LoaderFunctionArgs } from '@remix-run/server-runtime'
import { TYPE_RETURN } from '#app/components/item-transaction-row.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency } from '#app/utils/misc.tsx'
import { TRANSACTION_STATUS_COMPLETED } from '../transaction+/index.tsx'
export type TransactionReportDataType = {
	id: string
	status: string
	createdAt: Date
	totalDiscount: number
	subtotal: number
	total: number
	paymentMethod: string
	business: {
		name: string
	}
	seller: {
		name: string
	}
	items: Array<{
		id: string
		quantity: number
		type: string
		totalPrice: number
		totalDiscount: number
		item: {
			id: string
			name: string
			price: number
			stock: number
			sellingPrice: number

			category: {
				description: string
				id: string
			}
			supplier: {
				fantasyName: string
				id: string
			}
		}
	}>
}

export async function loader({ params }: LoaderFunctionArgs) {
	const transactionReportData = await prisma.transaction.findUnique({
		where: { id: params.reportId },
		select: {
			business: { select: { name: true } },
			id: true,
			status: true,
			createdAt: true,
			total: true,
			subtotal: true,
			totalDiscount: true,
			paymentMethod: true,
			seller: { select: { name: true } },
			items: {
				select: {
					id: true,
					quantity: true,
					type: true,
					totalDiscount: true,
					totalPrice: true,
					item: {
						select: {
							id: true,
							name: true,
							price: true,
							stock: true,
							sellingPrice: true,
							category: { select: { description: true, id: true } },
							supplier: { select: { fantasyName: true, id: true } },
						},
					},
				},
			},
		},
	})

	let stream = await renderToStream(
		<ReportDocument
			data={transactionReportData as TransactionReportDataType}
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

	let headers = new Headers({ 'Content-Type': 'application/pdf' })
	return new Response(body, { status: 200, headers })
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
	tableCol: {
		width: '15%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0,
		padding: 5,
	},
	mainTableCol: {
		width: '55%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0,
		padding: 5,
		textTransform: 'uppercase',
	},
	tableCell: {
		fontSize: 10,
	},
})

const ReportDocument = ({ data }: { data: TransactionReportDataType }) => {
	const calculatePreTotal = (items: TransactionReportDataType['items']) => {
		let preTotal = 0
		items.forEach(item => {
			if (item.type === TYPE_RETURN) {
				preTotal -= item.quantity * item.item.sellingPrice
			} else {
				preTotal += item.quantity * item.item.sellingPrice
			}
		})
		return preTotal
	}

	const shouldUsePreTotal = data.status !== TRANSACTION_STATUS_COMPLETED

	return (
		<Document>
			<Page size="A4" style={styles.page}>
				{/* Title Section */}
				<View style={styles.title}>
					<Text style={styles.titleText}>{data.business.name}</Text>
					<Text style={styles.titleText}>Reporte de Transacción</Text>
				</View>
				{/* Header Section */}
				<View style={styles.header}>
					<View style={styles.headerSection}>
						<Text style={styles.headerTextTitle}>
							Código de la transacción:
						</Text>{' '}
						<Text style={styles.headerText}>{data.id.toUpperCase()}</Text>
					</View>
					<View style={styles.headerSection}>
						<Text style={styles.headerTextTitle}>Estado:</Text>{' '}
						<Text style={styles.headerText}>{data.status}</Text>
					</View>
					<View style={styles.headerSection}>
						<Text style={styles.headerTextTitle}>Método de Pago:</Text>{' '}
						<Text style={styles.headerText}>{data.paymentMethod}</Text>
					</View>

					<View style={styles.headerSection}>
						<Text style={styles.headerTextTitle}>Fecha de creación:</Text>{' '}
						<Text style={styles.headerText}>
							{data.createdAt.toLocaleDateString()}
						</Text>
					</View>
					<View style={styles.headerSection}>
						<Text style={styles.headerTextTitle}>Vendedor:</Text>{' '}
						<Text style={styles.headerText}>{data.seller.name}</Text>
					</View>
				</View>

				{/* Table for Items */}
				<View style={styles.table}>
					{data.items.map((item, index) => (
						<View key={index} style={styles.tableRow}>
							{/* Define each column */}
							<View style={styles.mainTableCol}>
								<Text style={styles.tableCell}>{item.item.name}</Text>
							</View>
							{/* More columns for other details like quantity, price, etc. */}
							<View style={styles.tableCol}>
								<Text style={styles.tableCell}>{item.quantity}</Text>
							</View>
							<View style={styles.tableCol}>
								<Text style={styles.tableCell}>
									{formatCurrency(item.totalPrice)}
								</Text>
							</View>
							<View style={styles.tableCol}>
								<Text style={styles.tableCell}>{item.type}</Text>
							</View>
						</View>
					))}
				</View>
				<View style={styles.footer}>
					{data.status === TRANSACTION_STATUS_COMPLETED && (
						<>
							<View style={styles.footerSection}>
								<Text style={styles.footerTextTitle}>Subtotal:</Text>{' '}
								<Text style={styles.footerText}>
									{formatCurrency(data.subtotal)} CLP
								</Text>
							</View>
							<View style={styles.footerSection}>
								<Text style={styles.footerTextTitle}>Descuentos:</Text>{' '}
								<Text style={styles.footerText}>
									{formatCurrency(data.totalDiscount)} CLP
								</Text>
							</View>
						</>
					)}
					<View style={styles.footerSection}>
						<Text style={styles.footerTextTitle}>Total:</Text>
						<Text style={styles.footerText}>
							{shouldUsePreTotal
								? formatCurrency(calculatePreTotal(data.items))
								: formatCurrency(data.total)}{' '}
							CLP
						</Text>
					</View>
				</View>
			</Page>
		</Document>
	)
}
