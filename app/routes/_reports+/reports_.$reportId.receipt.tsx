import {
	Document,
	Page,
	StyleSheet,
	Text,
	View,
	renderToStream,
} from '@react-pdf/renderer'
import { type LoaderFunctionArgs } from '@remix-run/server-runtime'

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
	productOrders: Array<{
		id: string
		quantity: number
		type: string
		totalPrice: number
		totalDiscount: number
		productDetails: {
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
	let stream = await renderToStream(<Receipt data={receiptData} />)

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

const receiptData = {
	storeName: 'Store Name',
	storeAddress: '123 Example St, City, Country',
	storePhone: '(123) 456-7890',
	receiptNumber: '001234',
	date: '2024-06-18',
	items: [
		{ description: 'Item 1', quantity: 2, price: 5.0 },
		{ description: 'Item 2', quantity: 1, price: 10.0 },
		{ description: 'Item 3', quantity: 3, price: 7.5 },
		{ description: 'Item 1', quantity: 2, price: 5.0 },
		{ description: 'Item 2', quantity: 1, price: 10.0 },
		{ description: 'Item 3', quantity: 3, price: 7.5 },
		{ description: 'Item 1', quantity: 2, price: 5.0 },
		{ description: 'Item 2', quantity: 1, price: 10.0 },
		{ description: 'Item 3', quantity: 3, price: 7.5 },
		{ description: 'Item 1', quantity: 2, price: 5.0 },
		{ description: 'Item 2', quantity: 1, price: 10.0 },
		{ description: 'Item 3', quantity: 3, price: 7.5 },
		{ description: 'Item 1', quantity: 2, price: 5.0 },
		{ description: 'Item 2', quantity: 1, price: 10.0 },
		{ description: 'Item 3', quantity: 3, price: 7.5 },
		{ description: 'Item 1', quantity: 2, price: 5.0 },
		{ description: 'Item 2', quantity: 1, price: 10.0 },
		{ description: 'Item 3', quantity: 3, price: 7.5 },
		{ description: 'Item 1', quantity: 2, price: 5.0 },
		{ description: 'Item 2', quantity: 1, price: 10.0 },
		{ description: 'Item 3', quantity: 3, price: 7.5 },
		{ description: 'Item 1', quantity: 2, price: 5.0 },
		{ description: 'Item 2', quantity: 1, price: 10.0 },
		{ description: 'Item 3', quantity: 3, price: 7.5 },
		{ description: 'Item 1', quantity: 2, price: 5.0 },
		{ description: 'Item 2', quantity: 1, price: 10.0 },
		{ description: 'Item 3', quantity: 3, price: 7.5 },
		{ description: 'Item 1', quantity: 2, price: 5.0 },
		{ description: 'Item 2', quantity: 1, price: 10.0 },
		{ description: 'Item 3', quantity: 3, price: 7.5 },
		{ description: 'Item 1', quantity: 2, price: 5.0 },
		{ description: 'Item 2', quantity: 1, price: 10.0 },
		{ description: 'Item 3', quantity: 3, price: 7.5 },
		{ description: 'Item 1', quantity: 2, price: 5.0 },
		{ description: 'Item 2', quantity: 1, price: 10.0 },
		{ description: 'Item 3', quantity: 3, price: 7.5 },
	],
	total: 40.0,
	footerMessage: 'Thank you for shopping with us!',
}

// Styles
const styles = StyleSheet.create({
	page: {
		padding: 10,
		fontSize: 10,
		fontFamily: 'Helvetica',
	},
	header: {
		marginBottom: 10,
		textAlign: 'center',
	},
	section: {
		marginBottom: 10,
	},
	table: {
		display: 'flex',
		width: '100%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: '#000',
		borderRightWidth: 0,
		borderBottomWidth: 0,
	},
	tableRow: {
		flexDirection: 'row',
	},
	tableCol: {
		width: '33.33%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: '#000',
		borderLeftWidth: 0,
		borderTopWidth: 0,
		padding: 2,
	},
	total: {
		textAlign: 'right',
		fontWeight: 'bold',
	},
	footer: {
		marginTop: 10,
		textAlign: 'center',
		fontSize: 8,
	},
})
// const CUSTOM_80MM = [226.8, 1000]
// Receipt component
const Receipt = ({ data }) => (
	<Document>
		<Page wrap={false} size={`A7`} style={styles.page}>
			{/* Header */}
			<View style={styles.header}>
				<Text>{data.storeName}</Text>
				<Text>{data.storeAddress}</Text>
				<Text>{data.storePhone}</Text>
			</View>

			{/* Receipt Info */}
			<View style={styles.section}>
				<Text>Receipt #: {data.receiptNumber}</Text>
				<Text>Date: {data.date}</Text>
			</View>

			{/* Items Table */}
			<View style={styles.table}>
				<View style={styles.tableRow}>
					<View style={styles.tableCol}>
						<Text>Description</Text>
					</View>
					<View style={styles.tableCol}>
						<Text>Quantity</Text>
					</View>
					<View style={styles.tableCol}>
						<Text>Price</Text>
					</View>
				</View>
				{data.items.map((item, index) => (
					<View style={styles.tableRow} key={index}>
						<View style={styles.tableCol}>
							<Text>{item.description}</Text>
						</View>
						<View style={styles.tableCol}>
							<Text>{item.quantity}</Text>
						</View>
						<View style={styles.tableCol}>
							<Text>${item.price.toFixed(2)}</Text>
						</View>
					</View>
				))}
			</View>

			{/* Total */}
			<View style={styles.section}>
				<Text style={styles.total}>Total: ${data.total.toFixed(2)}</Text>
			</View>

			{/* Footer */}
			<View style={styles.footer}>
				<Text>{data.footerMessage}</Text>
			</View>
		</Page>
	</Document>
)
