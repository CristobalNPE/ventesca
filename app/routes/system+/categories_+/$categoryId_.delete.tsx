import { useForm } from '@conform-to/react'
import { parse } from '@conform-to/zod'

import { type ActionFunctionArgs, json } from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { invariantResponse, useIsPending } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'

const DeleteFormSchema = z.object({
	intent: z.literal('delete-category'),
	categoryId: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
	// const userId = await requireUserId(request)
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

	const { categoryId } = submission.value

	const category = await prisma.family.findFirst({
		select: { id: true, description: true },
		where: { id: categoryId },
	})
	invariantResponse(category, 'Not found', { status: 404 })

	await prisma.family.delete({ where: { id: category.id } })

	return redirectWithToast(`/system/categories`, {
		type: 'success',
		title: 'Categoría eliminada',
		description: `Categoría "${category?.description}" ha sido eliminada con éxito.`,
	})
}

export function DeleteCategory({ id }: { id: string }) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [form] = useForm({
		id: 'delete-category',
		lastSubmission: actionData?.submission,
	})

	return (
		<Form method="POST" action="delete" {...form.props}>
			<AuthenticityTokenInput />
			<input type="hidden" name="categoryId" value={id} />
			<StatusButton
				type="submit"
				name="intent"
				value="delete-category"
				variant="destructive"
				status={isPending ? 'pending' : actionData?.status ?? 'idle'}
				disabled={isPending}
			>
				<div className="flex items-center gap-2">
					<Icon name="trash" />
					<span>Eliminar</span>
				</div>
			</StatusButton>
			<ErrorList errors={form.errors} id={form.errorId} />
		</Form>
	)
}
