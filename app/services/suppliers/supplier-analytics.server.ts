import { prisma } from '#app/utils/db.server.ts'

export async function getSupplierTopSellingProducts(supplierId: string) {
	const products = await prisma.product.findMany({
		where: { supplierId },
		select: {
			id: true,
			name: true,
			code: true,
			productAnalytics: { select: { totalSales: true } },
		},
		orderBy: {
			productAnalytics: {
				totalSales: 'desc',
			},
		},
		take: 5,
	})

	//only return name and total sales
	return products.map((product, i) => ({
		id: product.id,
		top: i + 1,
		name: product.name,
		code: product.code,
		totalSales: product.productAnalytics!.totalSales,
	}))
}
