import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { type Category } from '@prisma/client'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	redirectDocument,
	type SerializeFrom,
} from '@remix-run/node'
import { Link, Outlet, useLoaderData, useLocation } from '@remix-run/react'
import { endOfWeek, startOfWeek } from 'date-fns'
import { z } from 'zod'
import { Spacer } from '#app/components/spacer.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency } from '#app/utils/misc.tsx'

import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { userHasRole, useUser } from '#app/utils/user.ts'
import { TransactionStatus } from '../transaction+/_types/transaction-status.ts'
import {
	CREATE_CATEGORY_KEY,
	CreateCategoryDialog,
	CreateCategorySchema,
} from './__new-category.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const weeklyProfits = await getWeeklyProfitsPerCategory(businessId)

	const categoryWithTopProfits = weeklyProfits[0]

	const categories = await prisma.category.findMany({
		where: { businessId },
		select: { id: true, code: true, description: true },
	})

	return json({ categories, categoryWithTopProfits })
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)
	const formData = await request.formData()
	const intent = formData.get('intent')

	invariantResponse(intent, 'Intent should be defined.')

	switch (intent) {
		case CREATE_CATEGORY_KEY: {
			return await handleCreateCategory(formData, businessId)
		}
	}
}

export default function CategoriesRoute() {
	const user = useUser()
	const isAdmin = userHasRole(user, 'Administrador')

	const { categories, categoryWithTopProfits } = useLoaderData<typeof loader>()

	return (
		<main className=" h-full">
			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
				<h1 className="text-xl font-semibold">Categorías</h1>
			</div>
			<Spacer size={'4xs'} />

			<div className="grid h-[85dvh]  items-start gap-4 lg:grid-cols-3 ">
				<div className="flex h-full flex-1 flex-col gap-4 overflow-hidden lg:col-span-1">
					{categoryWithTopProfits ? (
						<Card>
							<CardHeader className="pb-2">
								<CardDescription>Mayores ingresos esta semana</CardDescription>
								<CardTitle className="flex  items-center justify-between text-3xl">
									<Link to={categoryWithTopProfits.id} className=" text-2xl">
										{categoryWithTopProfits.description}
									</Link>
									<span className="text-muted-foreground">
										{formatCurrency(categoryWithTopProfits.totalProfit)}
									</span>
								</CardTitle>
							</CardHeader>
							<CardContent></CardContent>
							{isAdmin ? (
								<CardFooter>
									<CreateCategoryDialog />
								</CardFooter>
							) : null}
						</Card>
					) : isAdmin ? (
						<Card>
							<CardHeader className="pb-2">
								<CreateCategoryDialog />
							</CardHeader>
							<CardContent></CardContent>
						</Card>
					) : null}

					<CategoriesTable categories={categories} />
				</div>
				<div className="lg:col-span-2">
					<Outlet />
				</div>
			</div>
		</main>
	)
}

function CategoriesTable({
	categories,
}: {
	categories: SerializeFrom<Pick<Category, 'id' | 'code' | 'description'>>[]
}) {
	const location = useLocation()

	if (categories.length === 0) {
		return (
			<div className="flex h-full items-center justify-center rounded-sm bg-card text-muted-foreground">
				<p>Aun no existen categorías registradas en sistema.</p>
			</div>
		)
	}

	return (
		<Card className="no-scrollbar relative  h-full flex-grow overflow-y-auto">
			<CardHeader className="sticky top-0 z-10 bg-card px-7">
				<CardTitle>Categorías registradas</CardTitle>
				<CardDescription>
					Actualmente existen {categories.length} categorías registradas en
					sistema.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-1 ">
				{categories.map(category => (
					<LinkWithParams
						key={category.id}
						prefetch={'intent'}
						className={({ isActive }) =>
							cn(
								'flex flex-wrap items-center justify-between gap-2 rounded-sm border-2 border-l-8 border-transparent border-b-secondary/30 border-l-secondary/80 p-2 text-sm transition-colors hover:bg-secondary ',
								isActive && 'border-primary/10 bg-secondary',
							)
						}
						preserveSearch
						to={category.id}
					>
						<span className="flex-1 text-nowrap font-semibold">
							{category.code}
						</span>

						<span className="w-[15rem] text-nowrap  text-start  text-muted-foreground">
							{category.description}
						</span>
					</LinkWithParams>
				))}
			</CardContent>
		</Card>
	)
}

async function getWeeklyProfitsPerCategory(businessId: string) {
	let startDate = new Date()

	const currentWeekStartDate = startOfWeek(startDate)
	const currentWeekEndDate = endOfWeek(startDate)

	const itemTransactions = await prisma.itemTransaction.findMany({
		where: {
			transaction: { businessId },
			createdAt: {
				gte: currentWeekStartDate,
				lte: currentWeekEndDate,
			},
		},
		include: {
			item: {
				include: {
					category: true,
				},
			},
			transaction: true,
		},
	})

	type CategoryProfit = {
		category: Category
		totalProfit: number
	}

	const categoryProfits: { [key: string]: CategoryProfit } =
		itemTransactions.reduce(
			(acc, itemTransaction) => {
				const { item, totalPrice, transaction } = itemTransaction
				const profit =
					transaction.status === TransactionStatus.FINISHED ? totalPrice : 0

				if (!acc[item.category.id]) {
					acc[item.category.id] = {
						category: item.category,
						totalProfit: 0,
					}
				}

				acc[item.category.id].totalProfit += profit

				return acc
			},
			{} as { [key: string]: CategoryProfit },
		)

	const result = Object.values(categoryProfits).map(
		({ category, totalProfit }) => ({
			...category,
			totalProfit,
		}),
	)
	result.sort((a, b) => b.totalProfit - a.totalProfit)

	return result
}

async function handleCreateCategory(formData: FormData, businessId: string) {
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

	const { code, description } = submission.value

	const createdCategory = await prisma.category.create({
		data: {
			code,
			description,
			business: { connect: { id: businessId } },
		},
	})

	return redirectDocument(`/categories/${createdCategory.id}`)
}
