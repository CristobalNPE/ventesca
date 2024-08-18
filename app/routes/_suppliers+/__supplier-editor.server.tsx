import { parseWithZod } from '@conform-to/zod'
import { json, redirect, type ActionFunctionArgs } from '@remix-run/node'
import { clean, validate } from '@validatecl/rut'
import { z } from 'zod'

import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { SupplierInfoEditSchema } from './__supplier-editor'
import { redirectWithToast } from '#app/utils/toast.server.js'

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)
	const formData = await request.formData()

	//get full url from where the request came from
	const referer = request.headers.get('Referer')
	const isEdit = referer?.includes('edit')

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
			code: await calculateSupplierCode(businessId),
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

	if (isEdit) {
		return redirectWithToast(`/suppliers/${updatedSupplier.id}`, {
			type: 'success',
			title: 'Proveedor actualizado',
			description: 'El proveedor ha sido actualizado con éxito.',
		})
	}

	return redirectWithToast(`/suppliers/${updatedSupplier.id}`, {
		type: 'success',
		title: 'Proveedor registrado',
		description: 'El proveedor ha sido registrado con éxito.',
	})
}

async function calculateSupplierCode(businessId: string) {
	const lastSupplier = await prisma.supplier.findFirst({
		orderBy: { createdAt: 'desc' },
		where: { businessId },
		select: { code: true },
	})

	if (!lastSupplier) return 1

	const lastSupplierCode = lastSupplier.code
	const nextSupplierCode = lastSupplierCode + 1

	return nextSupplierCode
}
