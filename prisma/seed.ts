import { prisma } from '#app/utils/db.server.ts'
import { cleanupDb, createPassword } from '#tests/db-utils.ts'
import { faker } from '@faker-js/faker'

//config:
const NUMBER_OF_CATEGORIES = 15
const NUMBER_OF_SUPPLIERS = 80
const NUMBER_OF_PRODUCTS = 6000

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

	const allBusinesses = []
	const testBusiness = await prisma.business.create({
		data: {
			name: faker.company.name(),
		},
		select: { id: true },
	})

	const testBusiness2 = await prisma.business.create({
		data: {
			name: faker.company.name(),
		},
		select: { id: true },
	})

	allBusinesses.push(testBusiness)
	allBusinesses.push(testBusiness2)
	console.log(allBusinesses)

	console.timeEnd('🏫 Created testing business')

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

	console.time(`🐨 Created test users`)

	const users = []

	const user1 = await prisma.user.create({
		select: { id: true, businessId: true },
		data: {
			business: { connect: { id: testBusiness2.id } },
			email: 'admin@admin.dev',
			username: 'admin',
			name: 'Administrador Sistema',
			password: { create: createPassword('admin123') },

			roles: { connect: [{ name: 'admin' }, { name: 'user' }] },
		},
	})

	const user2 = await prisma.user.create({
		select: { id: true, businessId: true },
		data: {
			business: { connect: { id: testBusiness.id } },
			email: 'cristobal@dev.com',
			username: 'cris',
			name: 'Cristobal Pulgar Estay',
			password: { create: createPassword('cris123') },

			roles: { connect: [{ name: 'admin' }, { name: 'user' }] },
		},
	})

	users.push(user1, user2)
	console.timeEnd(`🐨 Created test users`)

	console.time(`📦 Created ${NUMBER_OF_CATEGORIES} categories...`)

	for (let business of allBusinesses) {
		for (let i = 0; i < NUMBER_OF_CATEGORIES; i++) {
			let code = i + 1
			await prisma.category.create({
				data: {
					code,
					description: faker.commerce.department(),
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
				Math.round(faker.number.int({ min: 1000, max: 50000 }) / 100) * 100
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
