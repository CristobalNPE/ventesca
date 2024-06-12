import { getFormProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { json, redirect, type ActionFunctionArgs } from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'

import { prisma } from '#app/utils/db.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'


//! ONLY ADMIN SHOULD BE ABLE TO ACTUALLY DELETE THE TRANSACTION. WHEN TRANSACTION IS DISCARDED FROM THE SALES PAGE, IT SHOULD BE ONLY FLAGGED AS DISCARDED.
const DeleteFormSchema = z.object({
	intent: z.literal('delete-transaction'),
	transactionId: z.string(),
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
	const { transactionId } = submission.value

	const transaction = await prisma.transaction.findFirst({
		select: { id: true },
		where: { id: transactionId },
	})

	invariantResponse(transaction, 'No se encuentra la transacción', {
		status: 404,
	})

	await prisma.transaction.delete({ where: { id: transaction.id } })

	return redirectWithToast(`/reports`, {
		type: 'success',
		title: 'Transacción Eliminada',
		description: `Transacción ${transaction.id} ha sido eliminada permanentemente .`,
	})
}

export function DeleteTransaction({ id }: { id: string }) {
	const actionData = useActionData<typeof action>()

	const isPending = useIsPending({
		formAction: '/transaction/delete',
	})
	const [form] = useForm({
		id: 'delete-transaction',
		lastResult: actionData?.result,
	})

	return (
		<Form method="POST" action="/transaction/delete" {...getFormProps(form)}>
			<AuthenticityTokenInput />
			<input type="hidden" name="transactionId" value={id} />

			<StatusButton
				type="submit"
				name="intent"
				value="delete-transaction"
				variant="destructive"
				status={isPending ? 'pending' : form.status ?? 'idle'}
				disabled={isPending}
			>
				<div className="flex items-center gap-2 ">
					<Icon name="trash" />
					<span>Eliminar Transacción</span>
				</div>
			</StatusButton>
			<ErrorList errors={form.errors} id={form.errorId} />
		</Form>
	)
}
