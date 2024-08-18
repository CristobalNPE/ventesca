import { prisma } from '#app/utils/db.server.ts'

export async function getBusinessCategories(businessId: string) {
	return await prisma.category.findMany({
		where: {
			businessId,
		},
		select: { name: true, id: true },
	})
}
