import { prisma } from '#app/utils/db.server.ts'
import { generateHexColor } from '#app/utils/misc.tsx'

export async function getBusinessCategories(businessId: string) {
	return await prisma.category.findMany({
		where: {
			businessId,
		},
		select: { name: true, id: true },
	})
}

export async function getDefaultCategory(businessId: string) {
	const defaultCategory = await prisma.category.findFirst({
		where: { businessId, isEssential: true },
	})

	if (defaultCategory) {
		return defaultCategory
	}

	return await prisma.category.create({
		data: {
			colorCode: generateHexColor(),
			code: 0,
			name: 'General',
			description:
				'Productos que no pertenecen a una categoría específica, o se encuentran sin clasificar.',
			business: { connect: { id: businessId } },
			isEssential: true,
		},
	})
}
