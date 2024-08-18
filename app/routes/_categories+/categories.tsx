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
import { Link, useLoaderData } from '@remix-run/react'
import { z } from 'zod'

import { CategoryCard } from '#app/components/categories/category-card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { useIsUserAdmin } from '#app/utils/user.ts'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
	createCategoryActionIntent,
	CreateCategoryDialog,
	CreateCategorySchema,
} from '#app/components/categories/category-create.tsx'
import { redirectWithToast } from '#app/utils/toast.server.js'
import { Button } from '#app/components/ui/button.js'

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
		orderBy: {
			code: 'asc',
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
	const { categories } = useLoaderData<typeof loader>()
	const [searchQuery, setSearchQuery] = useState('')
	const searchInputRef = useRef<HTMLInputElement>(null)

	const filteredCategories = useMemo(() => {
		return categories.filter(
			(category) =>
				category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				category.code === Number(searchQuery),
		)
	}, [categories, searchQuery])

	useEffect(() => {
		if (searchInputRef.current && filteredCategories.length === 0) {
			searchInputRef.current.select()
		}
	}, [filteredCategories])

	return (
		<ContentLayout
			title={`Categorías • ${categories.length} ${categories.length === 1 ? 'registrada' : 'registradas'}`}
			actions={<CategoriesActions />}
		>
			{/* TODO: Add filters*/}
			<div className="mb-8 flex items-center justify-center">
				{/*! We use client side search due to the small potential number of categories */}
				<div className="relative">
					<Input
						ref={searchInputRef}
						autoFocus
						className="w-fit min-w-[20rem] pr-[3rem] "
						type="text"
						placeholder="Buscar categoría"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
					<Icon
						name="magnifying-glass"
						className="absolute bottom-1/2 right-4 translate-y-1/2 transform"
					/>
				</div>
			</div>
			{filteredCategories.length > 0 ? (
				<main className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
					{filteredCategories.map((category) => (
						<CategoryCard key={category.id} category={category} />
					))}
				</main>
			) : (
				<div className="mt-12 flex flex-col items-center justify-center gap-4">
					<Icon
						name="question-mark-circled"
						className="text-muted-foreground"
						size="lg"
					/>
					<p className="text-center text-sm text-muted-foreground">
						No se encontraron categorías bajo el criterio de búsqueda.
					</p>
				</div>
			)}
		</ContentLayout>
	)
}

function CategoriesActions() {
	const isAdmin = useIsUserAdmin()
	return (
		<>
			{isAdmin && (
				<>
					<Button variant="outline" size="sm" asChild>
						<Link
							unstable_viewTransition
							prefetch="intent"
							to="transfer-products"
						>
							<Icon name="transfer">Transferir productos</Icon>
						</Link>
					</Button>
					<CreateCategoryDialog />
				</>
			)}
		</>
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

	return redirectWithToast(`/categories/${createdCategory.id}`, {
		title: 'Categoría creada',
		description: `La categoría '${name}' ha sido creada exitosamente.`,
	})
}
