import { faker } from '@faker-js/faker'
import { ItemTransactionType } from '#app/routes/transaction+/_types/item-transactionType.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cleanupDb, createPassword } from '#tests/db-utils.ts'

//config:
const NUMBER_OF_CATEGORIES = 12
const NUMBER_OF_SUPPLIERS = 10
const NUMBER_OF_PRODUCTS = 1000
const NUMBER_OF_TRANSACTIONS = 100

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)

	console.time('🧹 Cleaned up the database...')
	await cleanupDb(prisma)
	console.timeEnd('🧹 Cleaned up the database...')

	console.time('🔑 Created permissions...')
	const entities = ['user', 'business']
	const actions = ['create', 'read', 'update', 'delete']
	const accesses = ['own', 'any'] as const

	let permissionsToCreate = []
	for (const entity of entities) {
		for (const action of actions) {
			for (const access of accesses) {
				permissionsToCreate.push({ entity, action, access })
			}
		}
	}
	await prisma.permission.createMany({ data: permissionsToCreate })
	console.timeEnd('🔑 Created permissions...')

	console.time('🏫 Created testing business')

	const allBusinesses = []
	const testBusiness = await prisma.business.create({
		data: {
			name: faker.company.name(),
		},
		select: { id: true },
	})

	allBusinesses.push(testBusiness)

	console.timeEnd('🏫 Created testing business')

	console.time('👑 Created roles...')
	await prisma.role.create({
		data: {
			name: 'Administrador',
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
			name: 'Vendedor',
			permissions: {
				connect: await prisma.permission.findMany({
					select: { id: true },
					where: { access: 'own' },
				}),
			},
		},
	})
	await prisma.role.create({
		data: {
			name: 'SuperUser',
			permissions: {
				connect: await prisma.permission.findMany({
					select: { id: true },
					where: { access: 'any' },
				}),
			},
		},
	})

	console.timeEnd('👑 Created roles...')

	console.time(`🐨 Created test users`)

	const users = []
	const superuser = await prisma.user.create({
		select: { id: true, businessId: true },
		data: {
			business: { create: { name: 'SUPER BUSINESS' } },
			email: 'superuser@ventesca.super',
			username: 'superuser',
			name: 'SuperUser Ventesca System',
			password: { create: createPassword('super123') },

			roles: {
				connect: [
					{ name: 'Administrador' },
					{ name: 'Vendedor' },
					{ name: 'SuperUser' },
				],
			},
		},
	})

	const adminTest = await prisma.user.create({
		select: { id: true, businessId: true },
		data: {
			business: { connect: { id: testBusiness.id } },
			email: 'admin@admin.dev',
			username: 'admin',
			name: 'Administrador Sistema',
			password: { create: createPassword('admin123') },

			roles: {
				connect: [{ name: 'Administrador' }, { name: 'Vendedor' }],
			},
		},
	})

	const sellerTest1 = await prisma.user.create({
		select: { id: true, businessId: true },
		data: {
			business: { connect: { id: testBusiness.id } },
			email: 'cristobal@dev.com',
			username: 'cris',
			name: 'Cristobal Pulgar Estay',
			password: { create: createPassword('cris123') },

			roles: { connect: { name: 'Vendedor' } },
		},
	})
	const sellerTest2 = await prisma.user.create({
		select: { id: true, businessId: true },
		data: {
			business: { connect: { id: testBusiness.id } },
			email: 'suno@dev.com',
			username: 'suno',
			name: 'Sunito Sunero',
			password: { create: createPassword('suno123') },

			roles: { connect: { name: 'Vendedor' } },
		},
	})

	users.push(superuser, adminTest, sellerTest1, sellerTest2)
	console.timeEnd(`🐨 Created test users`)

	console.time(`📦 Created ${NUMBER_OF_CATEGORIES} categories...`)

	for (let business of allBusinesses) {
		for (let i = 0; i < NUMBER_OF_CATEGORIES; i++) {
			let code = i + 1
			await prisma.category.create({
				data: {
					code,
					description: `${faker.commerce.productAdjective()} ${faker.commerce.department()}`,
					business: { connect: { id: business.id } },
				},
			})
		}
	}

	console.timeEnd(`📦 Created ${NUMBER_OF_CATEGORIES} categories...`)

	console.time(`🤼 Created ${NUMBER_OF_SUPPLIERS} suppliers...`)
	for (let business of allBusinesses) {
		for (let i = 0; i < NUMBER_OF_SUPPLIERS; i++) {
			let firstName = faker.person.firstName()
			let lastName = faker.person.lastName()

			await prisma.supplier.create({
				data: {
					rut: generateFakeRUT(),
					name: `${firstName} ${lastName}`,
					address: `${faker.location.streetAddress()}, ${faker.location.buildingNumber()}`,
					city: faker.location.city(),
					fantasyName: faker.company.name(),
					phone: faker.phone.number(),
					email: `${firstName}.${lastName}.${faker.number.int({
						min: 1,
						max: 99,
					})}@xmail.com`,
					business: { connect: { id: business.id } },
				},
				select: { id: true },
			})
		}
	}

	console.timeEnd(`🤼 Created ${NUMBER_OF_SUPPLIERS} suppliers...`)

	console.time(`🛒 Created ${NUMBER_OF_PRODUCTS} products per business...`)

	for (let business of allBusinesses) {
		let businessSuppliers = await prisma.supplier.findMany({
			select: { id: true },
			where: { businessId: business.id },
		})

		let businessCategories = await prisma.category.findMany({
			select: { id: true },
			where: { businessId: business.id },
		})

		for (let i = 0; i < NUMBER_OF_PRODUCTS; i++) {
			let price =
				Math.round(faker.number.int({ min: 1000, max: 10500 }) / 100) * 100
			let sellingPrice = price * faker.number.int({ min: 2, max: 3 })
			let stock = faker.number.int({ min: 0, max: 99 })
			let isActive = price > 0 && sellingPrice > 0 && stock > 0

			await prisma.item.create({
				data: {
					code: i + 1,
					name: faker.commerce.productName(),
					sellingPrice,
					price,
					stock,
					isActive,
					business: { connect: { id: business.id } },
					category: {
						connect: {
							id: businessCategories[
								faker.number.int({ min: 0, max: businessCategories.length - 1 })
							].id,
						},
					},
					supplier: {
						connect: {
							id: businessSuppliers[
								faker.number.int({ min: 0, max: businessSuppliers.length - 1 })
							].id,
						},
					},
				},
			})
		}
	}

	console.timeEnd(`🛒 Created ${NUMBER_OF_PRODUCTS} products per business...`)

	console.time(`💰 Created ${NUMBER_OF_TRANSACTIONS} transactions per business`)

	const transactionStatuses = [
		'Finalizada',
		'Finalizada',
		'Finalizada',
		'Cancelada',
	]
	const paymentMethods = ['Contado', 'Crédito', 'Débito']

	for (let business of allBusinesses) {
		for (let i = 0; i < NUMBER_OF_TRANSACTIONS; i++) {
			const status = getRandomValue(transactionStatuses)

			let startDate = new Date()
			startDate.setHours(0, 0, 0, 0)
			const completedDate = faker.date.between({
				from: startDate.setFullYear(startDate.getFullYear() - 1),
				to: new Date(),
			})

			const sellers = await prisma.user.findMany({
				where: { businessId: business.id },
				select: { id: true },
			})

			const sellerIds = sellers.map(seller => seller.id)

			const createdTransaction = await prisma.transaction.create({
				data: {
					status: status,
					business: { connect: { id: business.id } },
					paymentMethod: getRandomValue(paymentMethods),
					subtotal: 0,
					total: 0,
					totalDiscount: 0,
					directDiscount: 0,
					isDiscarded: status === 'Cancelada',
					createdAt: subtractMinutes(completedDate, 10),
					updatedAt: completedDate,
					completedAt: completedDate,
					seller: { connect: { id: getRandomValue(sellerIds) } },
				},
			})

			const totalItemTransactions = faker.number.int({ min: 1, max: 15 })
			let totalItemPrice = 0

			for (let index = 0; index < totalItemTransactions; index++) {
				const itemForTransaction = await prisma.item.findFirst({
					where: {
						code: faker.number.int({ min: 1, max: NUMBER_OF_PRODUCTS }),
					},
					select: { id: true },
				})
				if (!itemForTransaction) continue

				const createdItemTransaction = await prisma.itemTransaction
					.create({
						data: {
							quantity: faker.number.int({ min: 2, max: 10 }),
							type: 'Venta',
							totalPrice: 0,
							totalDiscount: 0,
							createdAt: completedDate,
							item: {
								connect: {
									id: itemForTransaction.id,
								},
							},
							transaction: {
								connect: { id: createdTransaction.id },
							},
						},
						select: {
							id: true,
							quantity: true,
							item: true,
							itemId: true,
							type: true,
							totalPrice: true,
						},
					})
					.catch(e => null)

				if (createdItemTransaction) {
					totalItemPrice =
						createdItemTransaction.item.sellingPrice *
						createdItemTransaction.quantity

					await prisma.itemTransaction.update({
						where: { id: createdItemTransaction.id },
						data: { totalPrice: totalItemPrice },
					})
					await prisma.itemAnalytics.upsert({
						where: { itemId: createdItemTransaction.itemId },
						update: {
							totalProfit: { increment: createdItemTransaction.totalPrice },
							totalSales:
								createdItemTransaction.type === ItemTransactionType.RETURN
									? { decrement: createdItemTransaction.quantity }
									: { increment: createdItemTransaction.quantity },
						},
						create: {
							item: { connect: { id: createdItemTransaction.itemId } },
							totalProfit: createdItemTransaction.totalPrice,
							totalSales: createdItemTransaction.quantity,
						},
					})
				}
			}
			const transactionTotal = await prisma.itemTransaction.aggregate({
				where: { transactionId: createdTransaction.id },
				_sum: { totalPrice: true },
			})
			await prisma.transaction.update({
				where: { id: createdTransaction.id },
				data: {
					subtotal: transactionTotal._sum.totalPrice ?? 0,
					total: transactionTotal._sum.totalPrice ?? 0,
				},
			})
		}
	}

	console.timeEnd(
		`💰 Created ${NUMBER_OF_TRANSACTIONS} transactions per business`,
	)

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

function generateFakeRUT() {
	// Generate a random number for the first part (without the verifier digit)
	let randomNumber = Math.floor(Math.random() * 99999999) + 1000000
	let rutWithoutVerifier = randomNumber.toString().substr(0, 8) // Make sure it has 8 digits

	// Calculate the verifier digit using the algorithm for Chilean RUT
	let sum = 0
	let multipliers = [2, 3, 4, 5, 6, 7]
	for (
		let i = rutWithoutVerifier.length - 1, j = 0;
		i >= 0;
		i--, j = (j + 1) % 6
	) {
		sum += parseInt(rutWithoutVerifier[i]) * multipliers[j]
	}
	let verifierDigit: string | number = 11 - (sum % 11)
	if (verifierDigit == 10) {
		verifierDigit = 'K'
	} else if (verifierDigit == 11) {
		verifierDigit = 0
	}

	// Concatenate the random number and verifier digit to form the RUT
	let rut = rutWithoutVerifier + '-' + verifierDigit

	return rut
}
function getRandomValue(array: string[]): string {
	const randomIndex = Math.floor(Math.random() * array.length)
	return array[randomIndex]
}

function subtractMinutes(date: Date, minutesToSubtract: number): Date {
	const result = new Date(date)
	result.setMinutes(result.getMinutes() - minutesToSubtract)
	return result
}
