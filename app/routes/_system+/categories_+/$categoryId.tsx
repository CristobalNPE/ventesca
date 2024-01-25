import {
	json,
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, Link, useLoaderData, useNavigate } from '@remix-run/react'
import { useState } from 'react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import {
	SelectCategory,
	type Category,
} from '#app/components/select-category.tsx'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '#app/components/ui/alert-dialog.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { cn, invariantResponse, useIsPending } from '#app/utils/misc.tsx'
import { DeleteCategory } from './$categoryId_.delete.tsx'

export async function loader({ params }: LoaderFunctionArgs) {
	const category = await prisma.family.findUnique({
		where: { id: params.categoryId },
		select: {
			id: true,
			code: true,
			description: true,
			items: {
				select: {
					id: true,
					code: true,
					name: true,
				},
			},
			_count: { select: { items: true } },
		},
	})

	const allCategories = await prisma.family.findMany({
		select: { id: true, code: true, description: true },
		orderBy: { code: 'asc' },
	})

	invariantResponse(category, 'Not found', { status: 404 })

	return json({ category, allCategories })
}

const CategoryTransferSchema = z.object({
	itemsIds: z.string(),
	destinationCategory: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()

	const result = CategoryTransferSchema.safeParse({
		itemsIds: formData.get('itemsIds'),
		destinationCategory: formData.get('destinationCategory'),
	})

	if (!result.success) {
		return json({ status: 'error', errors: result.error.flatten() } as const, {
			status: 400,
		})
	}

	const { itemsIds, destinationCategory } = result.data
	const itemsToTransfer = itemsIds.split(',')

	await prisma.item.updateMany({
		where: { id: { in: itemsToTransfer } },
		data: { familyId: destinationCategory },
	})

	throw redirect(`/categories/${destinationCategory}`)
}

export default function CategoryRoute() {
	const navigate = useNavigate()
	const isAdmin = true
	const { category, allCategories } = useLoaderData<typeof loader>()
	const [selectedItemsIds, setSelectedItemsIds] = useState<string[]>([])
	const [destinationCategory, setDestinationCategory] =
		useState<Category | null>(null)

	//filter current category from allCategories
	const allCategoriesFiltered = allCategories.filter(c => c.id !== category.id)

	const [confirmTransfer, setConfirmTransfer] = useState(false)
	const [openTransferModal, setOpenTransferModal] = useState(false)

	const isPending = useIsPending()
	const itemsIds = category.items.map(i => i.id)
	const [itemsFilter, setItemsFilter] = useState('')

	const handleItemFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setItemsFilter(e.target.value)
	}

	const filteredItems = category.items.filter(item => {
		return item.name
			? item.name.toLowerCase().includes(itemsFilter.toLowerCase())
			: false
	})

	function isSelected(id: string) {
		return selectedItemsIds.includes(id)
	}

	function toggleSelected(id: string) {
		if (isSelected(id)) {
			setSelectedItemsIds(selectedItemsIds.filter(i => i !== id))
		} else {
			setSelectedItemsIds([...selectedItemsIds, id])
		}
	}

	const allSelected = selectedItemsIds.length === category.items.length

	return (
		<div className="flex h-[38rem] gap-8">
			<div className="w-[33.5rem]">
				<h1 className="text-foreground/80">Administrar Categoría</h1>
				<div className="mb-4 flex items-baseline gap-4 text-2xl">
					<span className="rounded-md bg-secondary px-1">
						ID {category.code}
					</span>
					<span className="font-semibold">{category.description}</span>
					<span className="text-lg text-foreground/80">
						{category._count.items} artículos.
					</span>
				</div>
				{category.items.length > 0 && (
					<>
						<div className="mb-2 flex items-center justify-between">
							<Input
								autoFocus
								type="text"
								onChange={handleItemFilterChange}
								defaultValue={itemsFilter}
								className="w-1/2"
								placeholder="Filtrar por nombre"
							/>
							{isAdmin && (
								<>
									{allSelected ? (
										<Button
											size={'sm'}
											className="w-[11rem]"
											variant={'destructive'}
											onClick={() => setSelectedItemsIds([])}
										>
											<Icon name={'cross-1'} className="mr-2" />
											Quitar Selección
										</Button>
									) : (
										<Button
											size={'sm'}
											className="w-[11rem]"
											variant={'secondary'}
											onClick={() => setSelectedItemsIds(itemsIds)}
										>
											<Icon name={'plus'} className="mr-2" />
											Seleccionar Todos
										</Button>
									)}
								</>
							)}
						</div>
						{filteredItems.length > 0 ? (
							<ScrollArea className="flex h-full flex-col  rounded-md border p-1">
								{filteredItems.map(item => (
									<div
										key={item.id}
										className={cn(
											'mb-1 flex cursor-pointer select-none items-center gap-2  rounded-sm p-1 hover:bg-primary/80',
											isSelected(item.id) &&
												'bg-primary/40 hover:bg-destructive/30',
										)}
										onClick={() => toggleSelected(item.id)}
									>
										<span className="w-[8rem] font-bold">{item.code}</span>
										<span>{item.name}</span>
									</div>
								))}
							</ScrollArea>
						) : (
							<div className="flex  flex-col  rounded-md border p-10 text-center">
								Sin Coincidencias
							</div>
						)}
					</>
				)}
				<Button
					variant={'ghost'}
					onClick={() => navigate(-1)}
					className="mt-2 flex items-center gap-2"
				>
					<Icon name="arrow-left" />
					<span>Atrás</span>
				</Button>
			</div>
			{isAdmin && (
				<div className="relative bottom-0 right-0 flex h-fit flex-col justify-end gap-4 rounded-md bg-secondary p-4">
					<span className=" text-sm text-foreground/80">
						<span className="font-bold">{selectedItemsIds.length}</span> de{' '}
						{category._count.items} seleccionados
					</span>
					{selectedItemsIds.length > 0 && (
						<AlertDialog
							open={openTransferModal}
							onOpenChange={setOpenTransferModal}
						>
							<AlertDialogTrigger asChild>
								<Button className="w-[14rem]" size={'lg'}>
									<Icon name="transfer" className="mr-2" />
									Transferir artículos
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent
								onEscapeKeyDown={() => {
									setDestinationCategory(null)
									setConfirmTransfer(false)
								}}
							>
								<AlertDialogHeader>
									<AlertDialogTitle>
										Transferencia de Categoría - {selectedItemsIds.length}{' '}
										articulo(s)
									</AlertDialogTitle>
									<AlertDialogDescription>
										<div className="mb-4">
											Seleccione la categoría de destino:
										</div>

										<SelectCategory
											categories={allCategoriesFiltered}
											selectedCategory={destinationCategory}
											setSelectedCategory={setDestinationCategory}
										/>
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter className="mt-8">
									{destinationCategory && confirmTransfer ? (
										<Form className="flex gap-4 " method="POST">
											<AuthenticityTokenInput />
											<input
												type="hidden"
												value={selectedItemsIds.join(',')}
												name="itemsIds"
											/>
											<input
												type="hidden"
												value={destinationCategory.id}
												name="destinationCategory"
											/>
											<AlertDialogCancel
												onClick={() => {
													setDestinationCategory(null)
													setConfirmTransfer(false)
												}}
											>
												Cancelar
											</AlertDialogCancel>
											<StatusButton
												type="submit"
												disabled={isPending}
												status={isPending ? 'pending' : 'idle'}
												onClick={() => setOpenTransferModal(false)}
											>
												<Icon className="mr-2" name="transfer" /> Confirmar
												Transferencia de Categoría
											</StatusButton>
										</Form>
									) : (
										<div className="flex gap-4">
											<AlertDialogCancel
												onClick={() => {
													setDestinationCategory(null)
													setConfirmTransfer(false)
												}}
											>
												Cancelar
											</AlertDialogCancel>
											<Button
												onClick={() => setConfirmTransfer(true)}
												disabled={!destinationCategory}
											>
												Continuar
											</Button>
										</div>
									)}
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					)}
					<Button className="w-[14rem]" size={'lg'} asChild>
						<Link to={'edit'}>
							<Icon name="update" className="mr-2" />
							Editar Categoría
						</Link>
					</Button>
					{itemsIds.length === 0 && (
						<ConfirmDeleteDialog id={category.id} name={category.description} />
					)}
				</div>
			)}
		</div>
	)
}

function ConfirmDeleteDialog({ id, name }: { id: string; name?: string }) {
	return (
		<AlertDialog>
			<AlertDialogTrigger>
				<Button variant={'outline'} className="w-[14rem]" size={'lg'}>
					<Icon className="mr-2" name="trash" />
					<span>Eliminar Categoría</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Confirmar eliminación de categoría {name}
					</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción no se puede deshacer. Por favor confirme que desea
						eliminar la categoría.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="flex gap-6">
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<DeleteCategory id={id} />
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>No tiene los permisos necesarios.</p>,
				404: ({ params }) => (
					<p>No existe categoría con ID: "{params.categoryId}".</p>
				),
			}}
		/>
	)
}
