import { requireUserId } from '#app/utils/auth.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'
import { ActionFunctionArgs, json } from '@remix-run/node'
import {
	DiscountNameEditorSchema,
	UPDATE_DISCOUNT_NAME_KEY,
} from './__discounts-editors/name-editor.tsx'
import { parseWithZod } from '@conform-to/zod'
import { prisma } from '#app/utils/db.server.ts'
import {
	DiscountDescriptionEditorSchema,
	UPDATE_DISCOUNT_DESCRIPTION_KEY,
} from './__discounts-editors/description-editor.tsx'

export async function action({ request }: ActionFunctionArgs) {
	//should require with admin permission later
	const userId = await requireUserId(request)

	const formData = await request.formData()

	const intent = formData.get('intent')

	invariantResponse(intent, 'Intent should be defined')

	switch (intent) {
		case UPDATE_DISCOUNT_NAME_KEY: {
			const submission = await parseWithZod(formData, {
				schema: DiscountNameEditorSchema,
			})
			if (submission.status !== 'success') {
				return json(
					{ result: submission.reply() },
					{ status: submission.status === 'error' ? 400 : 200 },
				)
			}

			const { discountId, name } = submission.value

			await prisma.discount.update({
				where: { id: discountId },
				data: { name },
			})

			return json({ result: submission.reply() })
		}
		case UPDATE_DISCOUNT_DESCRIPTION_KEY: {
			const submission = await parseWithZod(formData, {
				schema: DiscountDescriptionEditorSchema,
			})
			if (submission.status !== 'success') {
				return json(
					{ result: submission.reply() },
					{ status: submission.status === 'error' ? 400 : 200 },
				)
			}

			const { discountId, description } = submission.value

			await prisma.discount.update({
				where: { id: discountId },
				data: { description },
			})

			return json({ result: submission.reply() })
		}
	}
}
