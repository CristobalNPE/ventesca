import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'
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
import { requireUserId } from '#app/utils/auth.server.ts'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'

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
			<CardContent className="grid flex-1 gap-2 p-6 text-sm xl:grid-cols-5">
				<div className="col-span-3"></div>
				<div className="col-span-2 flex flex-col gap-3">
					<div className="font-semibold">
						Artículos asociados ( {category.items.length} )
					</div>

					<ScrollArea className="h-[34.7rem]">
						<ul className="grid gap-3">
							{category.items.map(item => (
								<li
									key={item.id}
									className="flex items-center justify-between rounded-sm transition-colors duration-100 hover:bg-secondary"
								>
									<div className="flex w-full items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														size={'sm'}
														className="h-7 w-7"
														variant={'outline'}
													>
														<Icon className="shrink-0" name="dots-vertical" />
														<span className="sr-only">More</span>
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem asChild>
														<Link to={`/inventory/${item.id}`}>
															Ver Detalles
														</Link>
													</DropdownMenuItem>
													{/* <DropdownMenuItem>Export</DropdownMenuItem>
													<DropdownMenuSeparator />
													<DropdownMenuItem>Trash</DropdownMenuItem> */}
												</DropdownMenuContent>
											</DropdownMenu>
											<span className="w-[14rem] text-muted-foreground">
												{item.name}
											</span>
										</div>
										<div className="flex  min-w-[4rem]  items-center gap-1 rounded-sm border-l-2 px-1">
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
