import { prisma } from '#app/utils/db.server.ts'
import { generateHexColor } from '#app/utils/misc.tsx'

export async function getBusinessSuppliers(businessId: string) {
	return await prisma.supplier.findMany({
		where: { businessId },
		select: { id: true, code: true, rut: true, fantasyName: true },
	})
}

export async function getDefaultSupplier(businessId: string) {
	const defaultSupplier = await prisma.supplier.findFirst({
		where: { businessId, isEssential: true },
	})

	if (defaultSupplier) {
		return defaultSupplier
	}

	const business = await prisma.business.findFirst({
		where: { id: businessId },
		select: { name: true, email: true },
	})

	return await prisma.supplier.create({
		data: {
			code: 0,
			rut: 'Sin Datos',
			name: business?.name ?? 'Sin Datos',
			address: 'Sin Datos',
			city: 'Sin Datos',
			fantasyName: `Proveedor Propio`,
			phone: 'Sin Datos',
			email: business?.email ?? 'Sin Datos',
			business: { connect: { id: businessId } },
			isEssential: true,
		},
	})
}

// export async function getDefaultSupplier({
// 	businessId,
// 	name,
// 	email,
// }: {
// 	businessId: string
// 	name: string
// 	email: string
// }) {
// 	const defaultSupplier = await prisma.supplier.findFirst({
// 		where: { businessId, isEssential: true },
// 	})

// 	if (defaultSupplier) {
// 		return defaultSupplier
// 	}

// 	return await prisma.supplier.create({
// 		data: {
// 			code: 0,
// 			rut: 'Sin Datos',
// 			name,
// 			address: 'Sin Datos',
// 			city: 'Sin Datos',
// 			fantasyName: `Proveedor Propio`,
// 			phone: 'Sin Datos',
// 			email,
// 			business: { connect: { id: businessId } },
// 			isEssential: true,
// 		},
// 	})
// }
