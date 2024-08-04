import { allDiscountApplicationMethods } from '#app/types/discounts/discount-applicationMethod.ts'
import { allDiscountScopes } from '#app/types/discounts/discount-scope.ts'
import { allDiscountTypes } from '#app/types/discounts/discount-type.ts'
import {
	allOrderStatuses,
	OrderStatus,
} from '#app/types/orders/order-status.ts'
import { allPaymentMethods } from '#app/types/orders/payment-method.ts'
import { allProductOrderTypes } from '#app/types/orders/productOrderType.ts'
import { prisma } from '#app/utils/db.server.ts'
import { createPassword } from '#tests/db-utils.ts'
import { faker } from '@faker-js/faker'

// const prisma = new PrismaClient();

interface SeedConfig {
	businessCount: number
	usersPerBusiness: number
	categoriesPerBusiness: number
	suppliersPerBusiness: number
	productsPerBusiness: number
	ordersPerBusiness: number
	discountsPerBusiness: number
}

const defaultConfig: SeedConfig = {
	businessCount: 1,
	usersPerBusiness: 5,
	categoriesPerBusiness: 15,
	suppliersPerBusiness: 5,
	productsPerBusiness: 5000,
	ordersPerBusiness: 20000,
	discountsPerBusiness: 0,
}

async function seed(config: SeedConfig = defaultConfig) {
	console.time('🌱 Seeding database...')

	for (let i = 0; i < config.businessCount; i++) {
		console.time(`🌱 Creating business...`)
		const business = await createBusiness()
		console.timeEnd(`🌱 Creating business...`)

		console.time(`🌱 Creating roles...`)
		await createRoles()
		console.timeEnd(`🌱 Creating roles...`)

		console.time('🌱 Creating admin...')
		await createAdmin(business.id)
		console.timeEnd('🌱 Creating admin...')

		console.time('🌱 Creating users...')
		await createUsers(business.id, config.usersPerBusiness)
		console.timeEnd('🌱 Creating users...')

		console.time('🌱 Creating categories...')
		const categories = await createCategories(
			business.id,
			config.categoriesPerBusiness,
		)
		console.timeEnd('🌱 Creating categories...')

		console.time('🌱 Creating suppliers...')
		const suppliers = await createSuppliers(
			business.id,
			config.suppliersPerBusiness,
		)
		console.timeEnd('🌱 Creating suppliers...')

		console.time('🌱 Creating products...')
		await createProducts(
			business.id,
			categories,
			suppliers,
			config.productsPerBusiness,
		)
		console.timeEnd('🌱 Creating products...')

		console.time('🌱 Creating discounts...')
		await createDiscounts(business.id, config.discountsPerBusiness)
		console.timeEnd('🌱 Creating discounts...')

		console.time('🌱 Creating orders...')
		await createOrders(business.id, config.ordersPerBusiness)
		console.timeEnd('🌱 Creating orders...')
	}

	console.timeEnd('🌱 Seeding database...')
}

async function createBusiness() {
	return prisma.business.create({
		data: {
			name: faker.company.name(),
			address: faker.location.streetAddress(),
			phone: faker.phone.number(),
			email: faker.internet.email(),
			thanksMessage: faker.lorem.sentence(),
		},
	})
}

async function createRoles() {
	await prisma.role.createMany({
		data: [
			{ name: 'Administrador', description: 'Administrador' },
			{ name: 'Vendedor', description: 'Vendedor' },
		],
	})
}

async function createAdmin(businessId: string) {
	await prisma.user.create({
		data: {
			email: 'admin@admin.com',
			username: 'admin',
			name: 'Administrador',
			password: { create: createPassword('admin123') },
			businessId,
			roles: {
				connect: [{ name: 'Administrador' }, { name: 'Vendedor' }],
			},
		},
	})
}
async function createUsers(businessId: string, count: number) {
	const roles = await prisma.role.findMany()
	for (let i = 0; i < count; i++) {
		await prisma.user.create({
			data: {
				email: faker.internet.email(),
				username: faker.internet.userName(),
				name: faker.person.fullName(),
				businessId,
				roles: {
					connect: [{ id: faker.helpers.arrayElement(roles).id }],
				},
				password: {
					create: {
						hash: faker.internet.password(),
					},
				},
			},
		})
	}
}

async function createCategories(businessId: string, count: number) {
	const categories = []
	for (let i = 0; i < count; i++) {
		const category = await prisma.category.create({
			data: {
				code: faker.number.int({ min: 1000, max: 9999 }),
				colorCode: faker.internet.color(),
				description: faker.commerce.department(),
				businessId,
				isEssential: faker.datatype.boolean(),
			},
		})
		categories.push(category)
	}
	return categories
}

async function createSuppliers(businessId: string, count: number) {
	const suppliers = []
	for (let i = 0; i < count; i++) {
		const supplier = await prisma.supplier.create({
			data: {
				code: faker.number.int({ min: 1000, max: 9999 }),
				rut: generateFakeRUT(),
				name: faker.company.name(),
				address: faker.location.streetAddress(),
				city: faker.location.city(),
				fantasyName: faker.company.catchPhrase(),
				phone: faker.phone.number(),
				email: faker.internet.email(),
				businessId,
				isEssential: faker.datatype.boolean(),
			},
		})
		suppliers.push(supplier)
	}
	return suppliers
}

async function createProducts(
	businessId: string,
	categories: any[],
	suppliers: any[],
	count: number,
) {
	for (let i = 0; i < count; i++) {
		const stock = faker.number.int({ min: 0, max: 100 })
		const isActive = stock > 0

		await prisma.product.create({
			data: {
				isActive,
				code: faker.string.nanoid(15),
				name: faker.commerce.productName(),
				sellingPrice: faker.number.int({ min: 1000, max: 100000 }),
				price: faker.number.int({ min: 500, max: 50000 }),
				stock,
				categoryId: faker.helpers.arrayElement(categories).id,
				supplierId: faker.helpers.arrayElement(suppliers).id,
				businessId,
				productAnalytics: { create: {} },
			},
		})
	}
}

async function createDiscounts(businessId: string, count: number) {
	for (let i = 0; i < count; i++) {
		await prisma.discount.create({
			data: {
				name: faker.commerce.productAdjective() + ' Discount',
				description: faker.lorem.sentence(),
				type: faker.helpers.arrayElement([...allDiscountTypes]),
				scope: faker.helpers.arrayElement([...allDiscountScopes]),
				applicationMethod: faker.helpers.arrayElement([
					...allDiscountApplicationMethods,
				]),
				minimumQuantity: faker.number.int({ min: 1, max: 10 }),
				value: faker.number.int({ min: 5, max: 50 }),
				validFrom: faker.date.past(),
				validUntil: faker.date.future(),
				isActive: faker.datatype.boolean(),
				businessId,
			},
		})
	}
}

async function createOrders(businessId: string, count: number) {
	const users = await prisma.user.findMany({ where: { businessId } })
	const products = await prisma.product.findMany({ where: { businessId } })

	for (let i = 0; i < count; i++) {
		const orderProducts = faker.helpers.arrayElements(
			products,
			faker.number.int({ min: 1, max: 5 }),
		)
		const subtotal = orderProducts.reduce(
			(sum, product) => sum + product.sellingPrice,
			0,
		)
		const totalDiscount = faker.number.int({ min: 0, max: subtotal * 0.2 })

		await prisma.order.create({
			data: {
				status: faker.helpers.arrayElement([
					OrderStatus.FINISHED,
					OrderStatus.DISCARDED,
				]),
				paymentMethod: faker.helpers.arrayElement([...allPaymentMethods]),
				subtotal,
				total: subtotal - totalDiscount,
				totalDiscount,
				directDiscount: faker.number.int({ min: 0, max: totalDiscount }),
				completedAt: faker.date.past(),
				sellerId: faker.helpers.arrayElement(users).id,
				businessId,
				productOrders: {
					create: orderProducts.map(product => ({
						quantity: faker.number.int({ min: 1, max: 5 }),
						type: faker.helpers.arrayElement([...allProductOrderTypes]),
						totalPrice: product.sellingPrice,
						totalDiscount: faker.number.int({
							min: 0,
							max: product.sellingPrice * 0.1,
						}),
						productId: product.id,
					})),
				},
			},
		})
	}
}

seed(defaultConfig)
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
		sum += parseInt(rutWithoutVerifier[i]!) * multipliers[j]!
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
