import { getFormProps, useForm } from '@conform-to/react'

import { json, redirect, type ActionFunctionArgs } from '@remix-run/node'
import { useActionData, useFetcher } from '@remix-run/react'
import { z } from 'zod'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'
import { parseWithZod } from '@conform-to/zod'

const DeleteFormSchema = z.object({
	intent: z.literal('delete-item-transaction'),
	itemTransactionId: z.string(),
})

export async function loader() {
	throw redirect('/sell')
}

export async function action({ request }: ActionFunctionArgs) {
	await requireUserId(request)
	const formData = await request.formData()

	const submission = parseWithZod(formData, {
		schema: DeleteFormSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { itemTransactionId } = submission.value

	const itemTransaction = await prisma.itemTransaction.findFirst({
		select: { id: true },
		where: { id: itemTransactionId },
	})

	invariantResponse(
		itemTransaction,
		'El articulo no existe en la transacción actual',
		{ status: 404 },
	)

	await prisma.itemTransaction.delete({ where: { id: itemTransaction.id } })

	return json({ result: submission.reply() })
}

export function DeleteItemTransaction({
	id,
	onClick,
}: {
	id: string
	onClick?: () => void
}) {
	const actionData = useActionData<typeof action>()
	const fetcher = useFetcher()
	const [form] = useForm({
		id: 'delete-item-transaction',
		lastResult: actionData?.result,
	})

	return (
		<fetcher.Form
			method="POST"
			action="/item-transaction/delete"
			{...getFormProps(form)}
		>
			<input type="hidden" name="itemTransactionId" value={id} />

			<Button
				type="submit"
				name="intent"
				value="delete-item-transaction"
				tabIndex={-1}
				variant={'ghost'}
				onClick={onClick}
			>
				<Icon name="cross-1" />
			</Button>
		</fetcher.Form>
	)
}
