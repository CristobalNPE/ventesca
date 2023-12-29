import { useForm } from '@conform-to/react'
import { parse } from '@conform-to/zod'

import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'
import { json, redirect, type ActionFunctionArgs } from '@remix-run/node'
import { useActionData, useFetcher } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'

const DeleteFormSchema = z.object({
	intent: z.literal('delete-item-transaction'),
	itemTransactionId: z.string(),
})

export async function loader() {
	throw redirect('/system/sell')
}

export async function action({ request }: ActionFunctionArgs) {
	await requireUserId(request)
	const formData = await request.formData()
	await validateCSRF(formData, request.headers)
	const submission = parse(formData, {
		schema: DeleteFormSchema,
	})

	if (submission.intent !== 'submit') {
		return json({ status: 'idle', submission } as const)
	}
	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
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

	return json({ status: 'success', submission } as const)
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
		lastSubmission: actionData?.submission,
	})

	return (
		<fetcher.Form
			method="POST"
			action="/system/item-transaction/delete"
			{...form.props}
		>
			<AuthenticityTokenInput />
			<input type="hidden" name="itemTransactionId" value={id} />

			<Button
				type="submit"
				name="intent"
				value="delete-item-transaction"
				tabIndex={-1}
				variant={'link'}
				className="relative left-2 top-2 h-2 w-5 p-0  text-destructive/50 focus-within:ring-0 hover:text-destructive focus-visible:ring-0 "
				onClick={onClick}
			>
				<Icon size="lg" name="cross-1" />
			</Button>
		</fetcher.Form>
	)
}
