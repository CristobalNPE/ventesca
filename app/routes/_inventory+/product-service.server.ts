




// export async function getCurrentWeekProductSales({
// 	productId,
// 	businessId,
// }: {
// 	productId: string
// 	businessId: string
// }) {
// 	const weekDays = eachDayOfInterval({
// 		start: startOfWeek(new Date(), { weekStartsOn: 1 }),
// 		end: endOfWeek(new Date(), { weekStartsOn: 1 }),
// 	})

// 	const dailySales = await Promise.all(
// 		weekDays.map(async (day) => {
// 			const orders = await prisma.order.findMany({
// 				where: {
// 					businessId,
// 					status: OrderStatus.FINISHED,
// 					completedAt: { gte: startOfDay(day), lte: endOfDay(day) },
// 				},
// 				select: {
// 					productOrders: {
// 						where: {
// 							productId,
// 						},
// 						select: { type: true, quantity: true },
// 					},
// 				},
// 			})

// 			const { totalSales, totalReturns } = orders.reduce(
// 				(acc, order) => {
// 					order.productOrders.forEach((po) => {
// 						if (po.type === ProductOrderType.RETURN) {
// 							acc.totalReturns += po.quantity
// 						} else {
// 							acc.totalSales += po.quantity
// 						}
// 					})
// 					return acc
// 				},
// 				{ totalSales: 0, totalReturns: 0 },
// 			)

// 			return {
// 				day: capitalize(
// 					format(day, 'eeee', {
// 						locale: es,
// 					}),
// 				),
// 				date: format(day, 'dd/MM/yyyy', {
// 					locale: es,
// 				}),
// 				totalSales,
// 				totalReturns,
// 			}
// 		}),
// 	)
// 	return dailySales
// }

