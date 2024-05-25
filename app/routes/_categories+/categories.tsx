import { Spacer } from '#app/components/spacer.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Progress } from '#app/components/ui/progress.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
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
import { cn } from '#app/utils/misc.tsx'
import { Category } from '@prisma/client'
import { LoaderFunctionArgs, SerializeFrom, json } from '@remix-run/node'
import { Outlet, useLoaderData, useLocation } from '@remix-run/react'

import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const categories = await prisma.category.findMany({
		where: { businessId },
		select: { id: true, code: true, description: true },
	})

	return json({ categories })
}

export default function TransactionReportsRoute() {
	const isAdmin = true

	const { categories } = useLoaderData<typeof loader>()

	return (
		<main className=" h-full">
			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
				<h1 className="text-xl font-semibold">Categorías</h1>
			</div>
			<Spacer size={'4xs'} />

			<div className="grid h-[93%]  gap-4 lg:grid-cols-3">
				<div className="grid gap-4 lg:col-span-1">
					<Card>
						<CardHeader className="pb-2">
							<CardDescription>This Week</CardDescription>
							<CardTitle className="text-4xl">$1,329</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-xs text-muted-foreground">
								+25% from last week
							</div>
						</CardContent>
						<CardFooter>
							<Progress value={25} aria-label="25% increase" />
						</CardFooter>
					</Card>

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

	return (
		<Card>
			<CardHeader className="px-7">
				<CardTitle>Categorías registradas</CardTitle>
				<CardDescription>
					Actualmente existen {categories.length} categorías registradas en
					sistema.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ScrollArea className="relative h-[25rem]  rounded-t-sm">
					<Table>
						<TableHeader className="sticky top-0 rounded-t-sm bg-secondary">
							<TableRow>
								<TableHead></TableHead>
								<TableHead>Código</TableHead>

								<TableHead className="text-right">Descripción</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{categories.map(category => (
								<TableRow
									key={category.id}
									className={cn(
										'duration-0 hover:bg-secondary/30',
										location.pathname.includes(category.id) &&
											'bg-secondary/50 hover:bg-secondary/50',
									)}
								>
									<TableCell className="text-xs uppercase">
										<Button size={'sm'} className="h-7 w-7" asChild>
											<LinkWithParams
												className={''}
												preserveSearch
												to={category.id}
											>
												<span className="sr-only">Detalles categoría</span>
												<Icon className="shrink-0" name="file-text" />
											</LinkWithParams>
										</Button>
									</TableCell>
									<TableCell className="text-xs uppercase">
										{category.code}
									</TableCell>

									<TableCell className="text-right">
										{category.description}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</ScrollArea>
			</CardContent>
		</Card>
	)
}
