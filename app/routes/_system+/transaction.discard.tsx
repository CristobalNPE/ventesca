import { useForm } from '@conform-to/react'
import { parse } from '@conform-to/zod'

import { json, redirect, type ActionFunctionArgs } from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { invariantResponse, useIsPending } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { destroyCurrentTransaction } from '#app/utils/transaction.server.ts'
import { TRANSACTION_STATUS_DISCARDED } from './sell.tsx'

//! ONLY ADMIN SHOULD BE ABLE TO ACTUALLY DELETE THE TRANSACTION. WHEN TRANSACTION IS DISCARDED FROM THE SALES PAGE, IT SHOULD BE ONLY FLAGGED AS DISCARDED.
const DeleteFormSchema = z.object({
	intent: z.literal('discard-transaction'),
	transactionId: z.string(),
})

export async function loader() {
	throw redirect('/sell')
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

	const { transactionId } = submission.value

	const transaction = await prisma.transaction.findFirst({
		select: { id: true },
		where: { id: transactionId },
	})

	invariantResponse(transaction, 'No se encuentra la transacción', {
		status: 404,
	})

	await prisma.transaction.update({
		where: { id: transaction.id },
		data: {
			isDiscarded: true,
			status: TRANSACTION_STATUS_DISCARDED,
			completedAt: new Date(),
		},
	})

	return redirectWithToast(
		`/reports`,
		{
			type: 'success',
			title: 'Transacción Descartada',
			description: `Transacción ${transaction.id} ha sido descartada.`,
		},
		{
			headers: {
				'Set-Cookie': await destroyCurrentTransaction(request),
			},
		},
	)
}

export function DiscardTransaction({ id }: { id: string }) {
	const actionData = useActionData<typeof action>()

	const isPending = useIsPending({
		formAction: '/transaction/discard',
	})
	const [form] = useForm({
		id: 'discard-transaction',
		lastSubmission: actionData?.submission,
	})

	return (
		<Form method="POST" action="/transaction/discard" {...form.props}>
			<AuthenticityTokenInput />
			<input type="hidden" name="transactionId" value={id} />

			<StatusButton
				type="submit"
				name="intent"
				value="discard-transaction"
				variant="destructive"
				status={isPending ? 'pending' : actionData?.status ?? 'idle'}
				disabled={isPending}
			>
				<div className="flex items-center gap-2 ">
					<Icon name="trash" />
					<span>Descartar Transacción</span>
				</div>
			</StatusButton>
			<ErrorList errors={form.errors} id={form.errorId} />
		</Form>
	)
}
