import { prisma } from '#app/utils/db.server.ts'
import { cleanupDb, createPassword } from '#tests/db-utils.ts'
import { parse } from 'csv-parse'
import cuid from 'cuid'
import fs from 'fs'

async function seed() {
	console.log('🌱 Seeding...')
	console.time(`🌱 Database has been seeded`)

	console.time('🧹 Cleaned up the database...')
	await cleanupDb(prisma)
	console.timeEnd('🧹 Cleaned up the database...')

	console.time('🔑 Created permissions...')
	const entities = ['user', 'item', 'family', 'provider']
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

	console.time('☺ Created families...')

	fs.createReadStream('./FAMILIA2.csv')
		.pipe(parse({ delimiter: ',', from_line: 2 }))
		.on('data', async function (row) {
			const [code, description] = row
			const codeAsInt = parseInt(code)
			await prisma.family.create({
				data: { code: codeAsInt, description },
			})
		})

	await prisma.family.create({
		data: { code: 99, description: 'SIN CLASIFICAR' },
	})

	console.timeEnd('☺ Created families...')

	console.time('🤼 Created providers...')

	fs.createReadStream('./providers.csv')
		.pipe(parse({ delimiter: ',', from_line: 2 }))
		.on('data', async function (row) {
			const [rut, nombre, direccion, ciudad, fanta, telefono, fax] = row

			// const parsedRUT = `${rut}${dv.trim() ? '-' + dv : ''}`
			const providerRut = rut.trim() ? rut : `Desconocido-${cuid()}`

			await prisma.provider.create({
				data: {
					rut: providerRut,
					name: nombre,
					address: direccion,
					city: ciudad,
					fantasyName: fanta,
					phone: telefono,
					fax,
				},
			})
		})

	await prisma.provider.create({
		data: {
			rut: 'Desconocido',
			name: 'Desconocido',
			address: 'Desconocido',
			city: 'Desconocido',
			fantasyName: 'Desconocido',
			phone: 'Desconocido',
			fax: 'Desconocido',
		},
	})

	console.timeEnd('🤼 Created providers...')

	console.time('🛒 Created products...')

	fs.createReadStream('./items.csv')
		.pipe(parse({ delimiter: ',', from_line: 2 }))
		.on('data', async function (row) {
			const [codigo, nombre, precio, familia, venta, rut, existencia] = row

			const existingProvider = await prisma.provider.findUnique({
				where: { rut: rut.trim() },
			})

			if (!existingProvider) {
				console.log(
					`⛔⛔ Provider with RUT ${rut} does not exist. It will be created.`,
				)
				await prisma.provider.upsert({
					where: { rut: rut.trim() },
					create: {
						rut: rut.trim(),

						name: 'Sin Definir',
						address: 'Sin Definir',
						city: 'Sin Definir',
						fantasyName: 'Sin Definir',
						phone: 'Sin Definir',
						fax: 'Sin Definir',
					},
					update: {},
				})
			}

			await prisma.item
				.create({
					data: {
						code: parseInt(codigo),
						name: nombre,
						sellingPrice: parseFloat(venta),
						price: parseFloat(precio),
						family: { connect: { code: parseInt(familia) } },
						provider: { connect: { rut: rut } },
						stock: parseInt(existencia) > 0 ? parseInt(existencia) : 0,
					},
				})
				.catch(e => ({}))
		})

	console.timeEnd('🛒 Created products...')

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
			email: 'admin@admin.dev',
			username: 'admin',
			name: 'Administrator',
			password: { create: createPassword('admin123') },

			roles: { connect: [{ name: 'admin' }, { name: 'user' }] },
		},
	})

	await prisma.user.create({
		select: { id: true },
		data: {
			email: 'cristobal@dev.com',
			username: 'cris',
			name: 'Cristobal',
			password: { create: createPassword('cris123') },

			roles: { connect: [{ name: 'admin' }, { name: 'user' }] },
		},
	})
	console.timeEnd(`🐨 Created admin user "admin"`)

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
