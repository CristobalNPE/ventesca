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
import { TRANSACTION_STATUS_COMPLETED } from '../sell.tsx'
export type TransactionReportDataType = {
	id: string
	status: string
	createdAt: Date
	total: number
	paymentMethod: string
	seller: {
		name: string
	}
	items: Array<{
		id: string
		quantity: number
		type: string
		item: {
			id: string
			name: string
			price: number
			stock: number
			sellingPrice: number
			family: {
				description: string
				id: string
			}
			provider: {
				fantasyName: string
				id: string
			}
		}
	}>
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	const transactionReportData = await prisma.transaction.findUnique({
		where: { id: params.reportId },
		select: {
			id: true,
			status: true,
			createdAt: true,
			total: true,
			paymentMethod: true,
			seller: { select: { name: true } },
			items: {
				select: {
					id: true,
					quantity: true,
					type: true,

					item: {
						select: {
							id: true,
							name: true,
							price: true,
							stock: true,
							sellingPrice: true,
							family: { select: { description: true, id: true } },
							provider: { select: { fantasyName: true, id: true } },
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
	},
	title: {
		marginBottom: 20,
		display: 'flex',
	},
	titleText: {
		marginBottom: 4,
		fontSize: 24,
		textAlign: 'center',
		fontWeight: 'black',
	},
	header: {
		marginBottom: 20,
	},
	headerText: {
		fontSize: 12,
		marginBottom: 4,
	},
	footer: {
		marginVertical: 40,
		display: 'flex',
		justifyContent: 'flex-end',
		alignItems: 'flex-end',
	},
	footerText: {
		fontSize: 18,
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
		width: '20%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0,
		padding: 5,
	},
	mainTableCol: {
		width: '40%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderLeftWidth: 0,
		borderTopWidth: 0,
		padding: 5,
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
					<Text style={styles.titleText}>Reporte de Transacción</Text>
					<Text style={styles.titleText}>Selim Amar y Cia Limitada</Text>
				</View>
				{/* Header Section */}
				<View style={styles.header}>
					<Text style={styles.headerText}>
						Código de la transacción: {data.id.toUpperCase()}
					</Text>
					<Text style={styles.headerText}>Estado: {data.status}</Text>
					<Text style={styles.headerText}>
						Método de Pago: {data.paymentMethod}
					</Text>
					<Text style={styles.headerText}>
						Fecha de creación: {data.createdAt.toLocaleDateString()}
					</Text>

					<Text style={styles.headerText}>Vendedor: {data.seller.name}</Text>
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
									{formatCurrency(item.item.sellingPrice)}
								</Text>
							</View>
							<View style={styles.tableCol}>
								<Text style={styles.tableCell}>{item.type}</Text>
							</View>
						</View>
					))}
				</View>
				<View style={styles.footer}>
					<Text style={styles.footerText}>
						Total:{' '}
						{shouldUsePreTotal
							? formatCurrency(calculatePreTotal(data.items))
							: formatCurrency(data.total)}
					</Text>
				</View>
			</Page>
		</Document>
	)
}
