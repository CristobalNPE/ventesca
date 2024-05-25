import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { cn, invariantResponse } from '#app/utils/misc.tsx'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { Badge } from '#app/components/ui/badge.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { Category, Item } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'

import { LinkWithParams } from '#app/components/ui/link-params.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserId(request)

	const category = await prisma.category.findUnique({
		where: { id: params.categoryId },
		select: {
			id: true,
			code: true,
			description: true,
			createdAt: true,
			updatedAt: true,
			items: { select: { id: true, code: true, name: true } },
		},
	})

	invariantResponse(category, 'Not found', { status: 404 })
	return json({ category })
}

export default function ReportRoute() {
	const { category } = useLoaderData<typeof loader>()

	return (
		<Card className="flex h-full flex-col overflow-hidden">
			<CardHeader className="flex flex-row items-start bg-muted/50">
				<div className="grid gap-0.5">
					<CardTitle className="group flex items-center gap-2 text-lg">
						<div className="flex gap-4 text-lg">
							<span>{category.description}</span>
							<Badge
								variant={'secondary'}
								className="flex items-center justify-center gap-1"
							>
								<Icon className="shrink-0" name="scan-barcode" />
								{category.code}
							</Badge>
						</div>
						<Button
							size="icon"
							variant="outline"
							className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<Icon name="copy" className="h-3 w-3" />
							<span className="sr-only">Copiar código categoría</span>
						</Button>
					</CardTitle>
					<CardDescription>
						Fecha registro:
						{format(new Date(category.createdAt), " dd' de 'MMMM', 'yyyy", {
							locale: es,
						})}
					</CardDescription>
				</div>
				<div className="ml-auto flex items-center gap-1">
					<ChangeItemsCategory />
					<Button asChild size="sm" variant="outline" className="h-8 gap-1">
						<Link target="_blank" reloadDocument to={``}>
							<Icon name="checklist" className="h-3.5 w-3.5" />
							<span className="lg:sr-only xl:not-sr-only xl:whitespace-nowrap">
								Generar reporte
							</span>
						</Link>
					</Button>
				</div>
			</CardHeader>
			<CardContent className="flex-1 p-6 text-sm grid-cols-5 grid gap-2">
				<div className="flex flex-col gap-3 col-span-2">
					<div className="font-semibold">
						Artículos asociados ( {category.items.length} )
					</div>
					{/* DEFER THIS WITH A SPINNER!!! */}
					<ScrollArea className="h-[34.7rem]">
						<ul className="grid gap-3">
							{category.items.map(item => (
								<li key={item.id} className="flex items-center justify-between hover:bg-secondary transition-colors duration-100 rounded-sm">
									<div className="flex items-center gap-2">
										<Button
											asChild
											size={'sm'}
											className="h-7 w-7"
											variant={'outline'}
										>
											<Link to={`/inventory/${item.id}`}>
												<Icon className="shrink-0" name="dots-vertical" />
												<span className="sr-only">Detalles del articulo</span>
											</Link>
										</Button>
										<span className="text-muted-foreground w-[14rem]">{item.name}</span>
										<div className="flex  items-center  gap-1 rounded-sm border-l-2 px-1">
											<Icon className="shrink-0" name="scan-barcode" />
											<span>{item.code}</span>
										</div>
									</div>
								</li>
							))}
						</ul>
					</ScrollArea>
					
				</div>

				
			</CardContent>
			<CardFooter className="flex flex-row items-center border-t bg-muted/50 px-6 py-3">
				<div className="text-xs text-muted-foreground">
					Actualizada por ultima vez el{' '}
					{format(
						new Date(category.updatedAt),
						"dd 'de' MMMM', 'yyyy' a las' hh:mm",
						{
							locale: es,
						},
					)}
				</div>
			</CardFooter>
		</Card>
	)
}

function ChangeItemsCategory() {
	return (
		<Button asChild size="sm" variant="outline" className="h-8 gap-1">
			<Link target="_blank" reloadDocument to={``}>
				<Icon name="update" className="h-3.5 w-3.5" />
				<span className="lg:sr-only xl:not-sr-only xl:whitespace-nowrap">
					Mover artículos
				</span>
			</Link>
		</Button>
	)
}

function CategoryItemsTable({
	items,
}: {
	items: SerializeFrom<Pick<Item, 'id' | 'code' | 'name'>>[]
}) {
	return (
		<ScrollArea className="relative h-[25rem]  rounded-t-sm border">
			<Table>
				<TableHeader className="sticky top-0 rounded-t-sm bg-secondary">
					<TableRow>
						<TableHead>Código</TableHead>

						<TableHead className="text-right">Descripción</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{items.map(item => (
						<TableRow
							key={item.id}
							className={'duration-0 hover:bg-background'}
						>
							<TableCell className="text-xs uppercase">
								<LinkWithParams className={''} preserveSearch to={item.id}>
									<span>{item.code}</span>
								</LinkWithParams>
							</TableCell>

							<TableCell className="text-right">{item.name}</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</ScrollArea>
	)
}
