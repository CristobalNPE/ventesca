import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency } from '#app/utils/misc.tsx'
import { Prisma } from '@prisma/client'
import * as QRCode from 'qrcode'

import {
	Document,
	Font,
	Image,
	Page,
	StyleSheet,
	Text,
	View,
	renderToStream,
} from '@react-pdf/renderer'
import { type LoaderFunctionArgs } from '@remix-run/server-runtime'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { pdf } from 'remix-utils/responses'
import { ProductOrderType } from '../order+/_types/productOrderType'

Font.register({
	family: 'B612 Mono',
	fonts: [
		{ src: 'public/fonts/b612/b612-mono-v14-latin-regular.ttf' },
		{ src: 'public/fonts/b612/b612-mono-v14-latin-700.ttf', fontWeight: 700 },
	],
})

Font.registerHyphenationCallback(word => [word])

type ReceiptOrderData = Prisma.OrderGetPayload<{
	select: {
		id: true
		total: true
		subtotal: true
		totalDiscount: true
		completedAt: true
		createdAt: true
		paymentMethod: true
		directDiscount: true
		discounts: { select: { id: true; name: true } }
		seller: { select: { name: true } }
		productOrders: {
			select: {
				totalPrice: true
				id: true
				quantity: true
				totalDiscount: true
				type: true
				productDetails: {
					select: {
						id: true
						code: true
						name: true
						sellingPrice: true
						discounts: { select: { name: true } }
					}
				}
			}
		}
	}
}>

type BusinessData = Prisma.BusinessGetPayload<{
	select: {
		name: true
		address: true
		phone: true
		email: true
		thanksMessage: true
		image: true
	}
}>

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const orderData = (await prisma.order.findUniqueOrThrow({
		where: { id: params.reportId },
		select: {
			id: true,
			total: true,
			subtotal: true,
			totalDiscount: true,
			completedAt: true,
			createdAt: true,
			paymentMethod: true,
			directDiscount: true,
			discounts: { select: { id: true, name: true } },
			seller: { select: { name: true } },
			productOrders: {
				select: {
					totalPrice: true,
					id: true,
					quantity: true,
					totalDiscount: true,
					type: true,
					productDetails: {
						select: {
							id: true,
							code: true,
							name: true,
							sellingPrice: true,
							discounts: { select: { name: true } },
						},
					},
				},
			},
		},
	})) satisfies ReceiptOrderData

	const businessData = (await prisma.business.findUniqueOrThrow({
		where: { id: businessId },
		select: {
			name: true,
			address: true,
			phone: true,
			email: true,
			thanksMessage: true,
			image: true,
		},
	})) satisfies BusinessData

	const qrCode = await QRCode.toDataURL(orderData.id)

	let stream = await renderToStream(
		<Receipt
			businessData={businessData}
			orderData={orderData}
			qrCode={qrCode}
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

// Styles
const styles = StyleSheet.create({
	page: {
		padding: 7,
		fontSize: 6,
		fontFamily: 'B612 Mono',
		letterSpacing: '-0.5px',
	},
	header: {
		marginBottom: 10,
		textAlign: 'center',
	},
	title: {
		fontSize: 10,
		fontWeight: 700,
	},
	section: {
		fontSize: 6,
		marginBottom: 10,
	},
	totalSection: {
		fontSize: 8,
		marginTop: 6,
		marginBottom: 10,
	},
	table: {
		display: 'flex',
		width: '100%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: 'white',
		borderRightWidth: 0,
		borderBottomWidth: 0,
	},
	tableRow: {
		flexDirection: 'row',
	},
	tableHeader: {
		flexDirection: 'row',
		fontWeight: 700,
	},
	tableCol: {
		width: '17.5%',
		textAlign: 'right',
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: 'white',
		borderLeftWidth: 0,
		borderTopWidth: 0,
		padding: 1,
	},

	tableDescription: {
		width: '40%',

		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: 'white',
		borderLeftWidth: 0,
		borderTopWidth: 0,
		padding: 1,
		textTransform: 'uppercase',
		overflow: 'hidden',
	},
	tableCode: {
		width: '25%',
		borderStyle: 'solid',
		borderWidth: 1,
		borderColor: 'white',
		borderLeftWidth: 0,
		borderTopWidth: 0,
		padding: 1,
		textTransform: 'uppercase',
	},
	totalContainer: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'flex-end',
	},
	total: {
		textAlign: 'right',
		fontWeight: 'bold',
		display: 'flex',
		flexDirection: 'row',
	},
	subs: {
		display: 'flex',
		flexDirection: 'row',
		textAlign: 'right',
		fontWeight: 'normal',
	},
	wideTextContainer: {
		display: 'flex',
		width: '30%',
		textAlign: 'right',
	},
	discounts: {
		marginTop: 2,
		textAlign: 'center',
		fontSize: 7,
	},
	footer: {
		marginTop: 10,
		textAlign: 'center',
		fontSize: 7,
	},
	discountListItem: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	separator: {
		marginVertical: 3,
	},
	qrcode: {
		marginHorizontal: 'auto',
		width: '80px',
		height: '80px',
	},
})

const Receipt = ({
	orderData,
	businessData,
	qrCode,
}: {
	orderData: ReceiptOrderData
	businessData: BusinessData
	qrCode: string
}) => {
	const currentDate = new Date()
	const date =
		orderData.createdAt.getTime() === orderData.completedAt.getTime()
			? currentDate
			: orderData.completedAt

	return (
		<Document
			producer={businessData.name}
			creator={businessData.name}
			title={`Boleta transacción ${orderData.id.toUpperCase().slice(-10)}`}
		>
			<Page size={`A7`} wrap={false} style={styles.page}>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>{businessData.name}</Text>
					<Text>{businessData.address}</Text>
					<Text>{businessData.phone}</Text>
				</View>
				{/* Receipt Info */}
				<View style={styles.section}>
					<Text>Transacción: {orderData.id.toUpperCase().slice(-10)}</Text>

					<Text>
						Fecha:{' '}
						{format(date, "d'-'MM'-'yyyy  HH:mm:ss", {
							locale: es,
						})}
					</Text>
					<Text>Atendido: {orderData.seller.name}</Text>
				</View>
				{/* Items Table */}
				<View style={styles.table}>
					<View style={styles.tableHeader}>
						<View style={styles.tableCode}>
							<Text>CÓDIGO</Text>
						</View>
						<View style={styles.tableDescription}>
							<Text>DESCRIPCIÓN</Text>
						</View>
						<View style={styles.tableCol}>
							<Text>VALOR</Text>
						</View>
						<View style={styles.tableCol}>
							<Text>DESC.</Text>
						</View>
					</View>
					{orderData.productOrders.map(productOrder => (
						<View style={styles.tableRow} key={productOrder.id}>
							<View style={styles.tableCode}>
								<Text>{productOrder.productDetails.code}</Text>
							</View>
							<View style={styles.tableDescription}>
								<Text>
									{productOrder.type === ProductOrderType.RETURN
										? `DEVOL `
										: productOrder.type === ProductOrderType.PROMO
											? 'PROMO '
											: null}
									{productOrder.quantity > 1
										? `${productOrder.quantity} X `
										: null}
									{productOrder.productDetails.name}
									{/* {productOrder.productDetails.name.replaceAll(' ', '\t')} */}
								</Text>
							</View>
							<View style={styles.tableCol}>
								<Text>{formatCurrency(productOrder.totalPrice)}</Text>
							</View>
							<View style={styles.tableCol}>
								<Text>
									{(productOrder.totalDiscount > 0 && productOrder.type === ProductOrderType.PROMO)
										? `-${formatCurrency(productOrder.totalDiscount)}`
										: null}
								</Text>
							</View>
						</View>
					))}
				</View>
				<Text style={styles.separator}>
					=========================================================
				</Text>
				<View style={styles.discounts}>
					<Text>Descuentos y promociones</Text>
				</View>
				<Text style={styles.separator}>
					---------------------------------------------------------
				</Text>
				<View>
					{orderData.productOrders
						.filter(
							productOrder => productOrder.type === ProductOrderType.PROMO,
						)
						.map(productOrderWithPromo => (
							<View key={productOrderWithPromo.id}>
								{productOrderWithPromo.productDetails.discounts.map(
									discount => (
										<View style={styles.discountListItem} key={discount.name}>
											<Text>
												** {discount.name} -{' '}
												{productOrderWithPromo.productDetails.name
													.slice(0, 10)
													.toUpperCase()}
											</Text>
											<Text>
												{formatCurrency(productOrderWithPromo.totalDiscount)}
											</Text>
										</View>
									),
								)}
							</View>
						))}
					{orderData.directDiscount > 0 ? (
						<View style={styles.discountListItem}>
							<Text>** Descuento directo</Text>
							<Text>{formatCurrency(orderData.directDiscount)}</Text>
						</View>
					) : null}
				</View>
				<Text style={styles.separator}>
					=========================================================
				</Text>
				<View style={styles.totalSection}>
					<View style={styles.totalContainer}>
						<Text style={styles.subs}>Subtotal:</Text>
						<Text style={styles.wideTextContainer}>
							{formatCurrency(orderData.subtotal)}
						</Text>
					</View>

					<View style={styles.totalContainer}>
						<Text style={styles.subs}>Descuento:</Text>
						<Text style={styles.wideTextContainer}>
							{formatCurrency(
								orderData.totalDiscount + orderData.directDiscount,
							)}
						</Text>
					</View>
					<View style={styles.totalContainer}>
						<Text style={styles.total}>Total : </Text>
						<Text style={styles.wideTextContainer}>
							{formatCurrency(orderData.total)}
						</Text>
					</View>
				</View>
				{/* Footer */}

				<Image source={qrCode} style={styles.qrcode} />

				<View style={styles.footer}>
					<Text>
						{businessData.thanksMessage ?? '̄¡ Gracias por su compra!'}
					</Text>
				</View>
			</Page>
		</Document>
	)
}
