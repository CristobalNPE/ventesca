import fs from 'fs'
import { faker } from '@faker-js/faker'
import { parse } from 'csv-parse'
import cuid from 'cuid'
import { prisma } from '#app/utils/db.server.ts'
import { cleanupDb, createPassword } from '#tests/db-utils.ts'

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)

	console.time('🧹 Cleaned up the database...')
	await cleanupDb(prisma)
	console.timeEnd('🧹 Cleaned up the database...')

	console.time('🔑 Created permissions...')
	const entities = ['user', 'item', 'category', 'provider']
	const actions = ['create', 'read', 'update', 'delete']
	const accesses = ['own', 'any'] as const
	for (const entity of entities) {
		for (const action of actions) {
			for (const access of accesses) {
				await prisma.permission.create({ data: { entity, action, access } })
			}
		}
	}
	console.timeEnd('🔑 Created permissions...')

	console.time('🏫 Created testing business')

	const testBusiness = await prisma.business.create({
		data: {
			name: 'Venta de cosas y CIA',
		},
	})

	const testBusiness2 = await prisma.business.create({
		data: {
			name: 'Venta de Administrador',
		},
	})

	console.timeEnd('🏫 Created testing business')

	// console.time('☺ Created families...')
	// //!NEED TO MOVE USERS UP
	// fs.createReadStream('./FAMILIA2.csv')
	// 	.pipe(parse({ delimiter: ',', from_line: 2 }))
	// 	.on('data', async function (row) {
	// 		const [code, description] = row
	// 		const codeAsInt = parseInt(code)
	// 		await prisma.category.create({
	// 			data: { code: codeAsInt, description },
	// 		})
	// 	})

	// await prisma.category.create({
	// 	data: { code: 999, description: 'General' },
	// })

	// console.timeEnd('☺ Created families...')

	// console.time('🤼 Created suppliers...')

	// fs.createReadStream('./providers.csv')
	// 	.pipe(parse({ delimiter: ',', from_line: 2 }))
	// 	.on('data', async function (row) {
	// 		const [rut, nombre, direccion, ciudad, fanta, telefono, fax] = row

	// 		// const parsedRUT = `${rut}${dv.trim() ? '-' + dv : ''}`
	// 		const supplierRut = rut.trim() ? rut : `Desconocido-${cuid()}`

	// 		await prisma.supplier.create({
	// 			data: {
	// 				rut: supplierRut,
	// 				name: nombre,
	// 				address: direccion,
	// 				city: ciudad,
	// 				fantasyName: fanta,
	// 				phone: telefono,
	// 				fax,
	// 			},
	// 		})
	// 	})
	// //create default provider
	// await prisma.supplier.create({
	// 	data: {
	// 		rut: 'Desconocido',
	// 		name: 'Desconocido',
	// 		address: 'Desconocido',
	// 		city: 'Desconocido',
	// 		fantasyName: 'Desconocido',
	// 		phone: 'Desconocido',
	// 		fax: 'Desconocido',
	// 	},
	// })

	// console.timeEnd('🤼 Created suppliers...')

	// console.time('🛒 Created products...')

	// fs.createReadStream('./items.csv')
	// 	.pipe(parse({ delimiter: ',', from_line: 2 }))
	// 	.on('data', async function (row) {
	// 		const [codigo, nombre, precio, familia, venta, rut, existencia] = row

	// 		const existingSupplier = await prisma.supplier.findUnique({
	// 			where: { rut: rut.trim() },
	// 		})

	// 		if (!existingSupplier) {
	// 			console.log(
	// 				`⛔⛔ Supplier with RUT ${rut} does not exist. It will be created.`,
	// 			)
	// 			await prisma.supplier.upsert({
	// 				where: { rut: rut.trim() },
	// 				create: {
	// 					rut: rut.trim(),

	// 					name: 'Sin Definir',
	// 					address: 'Sin Definir',
	// 					city: 'Sin Definir',
	// 					fantasyName: 'Sin Definir',
	// 					phone: 'Sin Definir',
	// 					fax: 'Sin Definir',
	// 				},
	// 				update: {},
	// 			})
	// 		}

	// 		const isActive =
	// 			parseFloat(venta) > 0 &&
	// 			parseFloat(precio) > 0 &&
	// 			parseInt(existencia) > 0

	// 		await prisma.item
	// 			.create({
	// 				data: {
	// 					code: parseInt(codigo),
	// 					isActive: isActive,
	// 					name: nombre,
	// 					sellingPrice: parseFloat(venta) ?? 0,
	// 					price: parseFloat(precio) ?? 0,
	// 					category: { connect: { code: parseInt(familia) } },
	// 					supplier: { connect: { rut: rut } },
	// 					stock: parseInt(existencia) > 0 ? parseInt(existencia) : 0,
	// 				},
	// 			})
	// 			.catch(e => ({}))
	// 	})

	// console.timeEnd('🛒 Created products...')

	console.time('👑 Created roles...')
	await prisma.role.create({
		data: {
			name: 'admin',
			permissions: {
				connect: await prisma.permission.findMany({
					select: { id: true },
					where: { access: 'any' },
				}),
			},
		},
	})
	await prisma.role.create({
		data: {
			name: 'user',
			permissions: {
				connect: await prisma.permission.findMany({
					select: { id: true },
					where: { access: 'own' },
				}),
			},
		},
	})

	console.timeEnd('👑 Created roles...')

	console.time(`🐨 Created admin user "admin"`)

	await prisma.user.create({
		select: { id: true },
		data: {
			business: { connect: { id: testBusiness2.id } },
			email: 'admin@admin.dev',
			username: 'admin',
			name: 'Administrador Sistema Ventas',
			password: { create: createPassword('admin123') },

			roles: { connect: [{ name: 'admin' }, { name: 'user' }] },
		},
	})

	await prisma.user.create({
		select: { id: true },
		data: {
			business: { connect: { id: testBusiness.id } },
			email: 'cristobal@dev.com',
			username: 'cris',
			name: 'Cristobal Pulgar Estay',
			password: { create: createPassword('cris123') },

			roles: { connect: [{ name: 'admin' }, { name: 'user' }] },
		},
	})
	console.timeEnd(`🐨 Created admin user "admin"`)

	// console.time('💰 Created transactions...')

	// const totalTransactions = 100
	// const statuses = ['Finalizada', 'Finalizada', 'Finalizada', 'Cancelada']
	// const paymentMethods = ['Contado', 'Crédito']

	// for (let index = 0; index < totalTransactions; index++) {
	// 	const creationDate = getRandomDateWithinTwoYears()
	// 	const status = getRandomValue(statuses)

	// 	const createdTransaction = await prisma.transaction.create({
	// 		data: {
	// 			status: status,
	// 			paymentMethod: getRandomValue(paymentMethods),
	// 			subtotal: 0,
	// 			total: 0,
	// 			totalDiscount: 0,
	// 			isDiscarded: status === 'Cancelada',
	// 			createdAt: subtractMinutes(creationDate, 10),
	// 			updatedAt: creationDate,
	// 			completedAt: creationDate,
	// 			seller: { connect: { id: adminUser.id } },
	// 		},
	// 	})

	// 	const totalItemTransactions = faker.number.int({ min: 1, max: 10 })
	// 	let totalItemPrice = 0

	// 	for (let index = 0; index < totalItemTransactions; index++) {
	// 		const itemForTransaction = await prisma.item.findFirst({
	// 			where: { code: faker.number.int({ min: 1, max: 5000 }) },
	// 			select: { id: true },
	// 		})

	// 		if (!itemForTransaction) continue

	// 		const createdItemTransaction = await prisma.itemTransaction
	// 			.create({
	// 				data: {
	// 					quantity: faker.number.int({ min: 1, max: 5 }),
	// 					type: 'Venta',
	// 					totalPrice: 0,
	// 					totalDiscount: 0,
	// 					item: {
	// 						connect: {
	// 							id: itemForTransaction.id,
	// 						},
	// 					},
	// 					transaction: {
	// 						connect: { id: createdTransaction.id },
	// 					},
	// 				},
	// 				select: { id: true, quantity: true, item: true },
	// 			})
	// 			.catch(e => null)

	// 		// update totalPrice of the transaction to be the sum of all item multiplied by their quantity
	// 		if (createdItemTransaction) {
	// 			const priceOfItem = createdItemTransaction.item?.sellingPrice ?? 0
	// 			totalItemPrice = createdItemTransaction.quantity * priceOfItem
	// 		}

	// 		if (totalItemPrice > 0 && createdItemTransaction) {
	// 			await prisma.itemTransaction.update({
	// 				where: { id: createdItemTransaction.id },
	// 				data: { totalPrice: totalItemPrice },
	// 			})
	// 		}
	// 	}
	// 	const transactionTotal = await prisma.itemTransaction.aggregate({
	// 		where: { transactionId: createdTransaction.id },
	// 		_sum: { totalPrice: true },
	// 	})
	// 	await prisma.transaction.update({
	// 		where: { id: createdTransaction.id },
	// 		data: {
	// 			subtotal: transactionTotal._sum.totalPrice ?? 0,
	// 			total: transactionTotal._sum.totalPrice ?? 0,
	// 		},
	// 	})
	// }

	// console.timeEnd('💰 Created transactions...')

	console.timeEnd(`🌱 Database has been seeded`)
}

seed()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})

function getRandomDateWithinTwoYears(): Date {
	const now = new Date()
	const twoYearsAgo = new Date(
		now.getFullYear() - 2,
		now.getMonth(),
		now.getDate(),
	)

	const randomTime = randomDateInRange(twoYearsAgo.getTime(), now.getTime())
	return new Date(randomTime)
}

function randomDateInRange(start: number, end: number): number {
	return start + Math.random() * (end - start)
}
function getRandomValue(array: string[]): string {
	const randomIndex = Math.floor(Math.random() * array.length)
	return array[randomIndex]
}
// function subtractDays(date: Date, daysToSubtract: number): Date {
// 	const result = new Date(date)
// 	result.setDate(result.getDate() - daysToSubtract)
// 	return result
// }
function subtractMinutes(date: Date, minutesToSubtract: number): Date {
	const result = new Date(date)
	result.setMinutes(result.getMinutes() - minutesToSubtract)
	return result
}
