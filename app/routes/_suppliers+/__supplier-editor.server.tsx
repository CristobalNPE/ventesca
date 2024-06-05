import { prisma } from '#app/utils/db.server.ts'
import { parseWithZod } from '@conform-to/zod'
import { json, redirect, type ActionFunctionArgs } from '@remix-run/node'
import { clean, validate } from '@validatecl/rut'
import { z } from 'zod'

import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { SupplierInfoEditSchema } from './__supplier-editor'

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)
	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: SupplierInfoEditSchema.superRefine(async (data, ctx) => {
			const supplierByRut = await prisma.supplier.findFirst({
				select: { id: true, rut: true },
				where: { businessId, rut: data.rut },
			})

			if (supplierByRut && supplierByRut.id !== data.id) {
				ctx.addIssue({
					path: ['rut'],
					code: z.ZodIssueCode.custom,
					message: 'Ya existe un proveedor con este RUT.',
				})
			}

			if (!validate(data.rut)) {
				ctx.addIssue({
					path: ['rut'],
					code: z.ZodIssueCode.custom,
					message: 'RUT inválido.',
				})
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { address, city, email, fantasyName, name, phone, rut, id } =
		submission.value

	const cleanedRut = clean(rut)

	const updatedSupplier = await prisma.supplier.upsert({
		select: { id: true },
		where: { id: id ?? '__new_supplier__' },
		create: {
			rut: cleanedRut ?? rut,
			name,
			address,
			city,
			fantasyName,
			phone,
			email,
			business: { connect: { id: businessId } },
		},
		update: {
			rut: cleanedRut ?? rut,
			name,
			address,
			city,
			fantasyName,
			phone,
			email,
		},
	})

	return redirect(`/suppliers/${updatedSupplier.id}`)
}
