import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { parseWithZod } from '@conform-to/zod'
import { type ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { BusinessEditSchema } from './__business-editor'

export async function action({ request }: ActionFunctionArgs) {
	await requireUserWithRole(request, 'Administrador')
	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: BusinessEditSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { id, name, phone, email, address, thanksMessage } = submission.value

	await prisma.business.update({
		where: { id },
		data: {
			name,
			phone,
			email,
			address,
			thanksMessage,
		},
	})

	return redirect(`/business`)
}
