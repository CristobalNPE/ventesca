import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { parseWithZod } from '@conform-to/zod'
import { type ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { OrderReportEditSchema } from './__order-editor'

export async function action({ request }: ActionFunctionArgs) {
	await requireUserWithRole(request, 'Administrador')
	const formData = await request.formData()

	const url = new URL(request.url)
	const params = url.searchParams.toString()

	const submission = await parseWithZod(formData, {
		schema: OrderReportEditSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { id, status, paymentMethod, directDiscount } = submission.value

	const order = await prisma.order.findUniqueOrThrow({ where: { id } })

	//"Restore" order total pre-discount
	const orderTotal = order.total + order.directDiscount
	// SHOULD RESTORE STOCK IF CHANGED BACK TO CANCELED, AND TAKE FROM STOCK IF CHANGED TO FINISHED
	//!Will need to recalculate totals/subtotals when modifying products

	await prisma.order.update({
		where: { id },
		data: {
			status,
			paymentMethod,
			directDiscount,
			total: order.total - directDiscount,
			subtotal: orderTotal,
		},
	})

	return redirect(`/reports/${id}${params ? `?${params}` : ''}`)
}
