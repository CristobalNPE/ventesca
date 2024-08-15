import { ContentLayout } from '#app/components/layout/content-layout.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { generateHexColor } from '#app/utils/misc.tsx'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	redirectDocument,
} from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { z } from 'zod'

import { CategoryCard } from '#app/components/categories/category-card.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { useIsUserAdmin } from '#app/utils/user.ts'
import {
	createCategoryActionIntent,
	CreateCategoryDialog,
	CreateCategorySchema,
} from './__new-category.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const categories = await prisma.category.findMany({
		where: { businessId },
		select: {
			id: true,
			code: true,
			colorCode: true,
			name: true,
			description: true,
			_count: { select: { products: true } },
		},
	})

	return json({ categories })
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)
	const formData = await request.formData()
	const intent = formData.get('intent')

	invariantResponse(intent, 'Intent should be defined.')

	switch (intent) {
		case createCategoryActionIntent: {
			return await createCategoryAction(formData, businessId)
		}
	}
}

export default function CategoriesRoute() {
	const isAdmin = useIsUserAdmin()

	const { categories } = useLoaderData<typeof loader>()

	return (
		<ContentLayout
			title="Categorías"
			actions={isAdmin && <CreateCategoryDialog />}
		>
			{/* TODO: Add a search bar */}
			<main className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{categories.map((category) => (
					<CategoryCard key={category.id} category={category} />
				))}
			</main>
		</ContentLayout>
	)
}

async function createCategoryAction(formData: FormData, businessId: string) {
	const submission = await parseWithZod(formData, {
		schema: CreateCategorySchema.superRefine(async (data, ctx) => {
			const categoryByCode = await prisma.category.findFirst({
				select: { id: true, code: true },
				where: { businessId, code: data.code },
			})

			if (categoryByCode) {
				ctx.addIssue({
					path: ['code'],
					code: z.ZodIssueCode.custom,
					message: 'El código ya existe.',
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

	const { code, name } = submission.value

	const createdCategory = await prisma.category.create({
		data: {
			name,
			colorCode: generateHexColor(),
			code,
			description: `Agrupa todos los productos relacionados con '${name}'`,
			business: { connect: { id: businessId } },
		},
	})

	return redirectDocument(`/categories/${createdCategory.id}`)
}
