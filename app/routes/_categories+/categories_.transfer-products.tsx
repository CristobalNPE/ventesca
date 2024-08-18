import { ContentLayout } from '#app/components/layout/content-layout.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { StatusButton } from '#app/components/ui/status-button.js'
import { getBusinessCategories } from '#app/services/categories/categories-queries.server.js'
import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn } from '#app/utils/misc.js'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { useForm, useInputControl } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, json, LoaderFunctionArgs } from '@remix-run/node'
import {
	useBlocker,
	useFetcher,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

type SelectedProduct = {
	id: string
	name: string
	code: string
	category: { name: string }
}

export const CategoryProductsTransferSchema = z.object({
	destinationCategoryId: z.string(),
	productsIds: z.array(z.string()),
})

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)
	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: CategoryProductsTransferSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { destinationCategoryId, productsIds } = submission.value

	await prisma.product.updateMany({
		where: { id: { in: productsIds }, businessId },
		data: { categoryId: destinationCategoryId },
	})

	return json({ result: submission.reply() })
}

export async function loader({ params, request }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)
	const originCategoryId = new URL(request.url).searchParams.get(
		'origin-category-id',
	)

	const businessCategories = await getBusinessCategories(businessId)

	const selectedOriginCategory = originCategoryId
		? await prisma.category.findUniqueOrThrow({
				where: {
					id: originCategoryId,
					businessId,
				},
				select: {
					id: true,
					name: true,
					products: {
						select: {
							id: true,
							name: true,
							code: true,
							category: { select: { name: true } },
						},
					},
				},
			})
		: null

	return json({
		businessCategories,
		selectedOriginCategory,
	})
}

export default function CategoryProductsTransfer() {
	const { businessCategories, selectedOriginCategory } =
		useLoaderData<typeof loader>()

	const [_, setSearchParams] = useSearchParams()
	const fetcher = useFetcher<typeof action>({
		key: `transfer-category-products`,
	})
	const isPending = fetcher.state !== 'idle'

	const [form, fields] = useForm({
		id: 'transfer-category-products',
		constraint: getZodConstraint(CategoryProductsTransferSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CategoryProductsTransferSchema })
		},
	})

	const [originCategory, setOriginCategory] = useState('')
	const destinationCategory = useInputControl(fields.destinationCategoryId)
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
		[],
	)

	const filteredOriginCategoryProducts = useMemo(() => {
		return selectedOriginCategory?.products.filter(
			(product) =>
				product.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
				product.code.toLowerCase().includes(searchQuery.toLowerCase().trim()),
		)
	}, [selectedOriginCategory, searchQuery])

	function handleOriginCategoryChange(value: string) {
		setSearchParams({ 'origin-category-id': value })
		setOriginCategory(value)
	}

	function handleProductSelect(product: SelectedProduct) {
		const selectedProductsIds = selectedProducts.map(
			(selectedProduct) => selectedProduct.id,
		)
		setSelectedProducts((prevSelectedProducts) =>
			selectedProductsIds.includes(product.id)
				? prevSelectedProducts.filter(
						(selectedProduct) => selectedProduct.id !== product.id,
					)
				: [...prevSelectedProducts, product],
		)
	}

	function handleSubmit() {
		if (!destinationCategory.value || selectedProducts.length === 0) return

		const formData = new FormData()

		formData.append('destinationCategoryId', destinationCategory.value)
		selectedProducts.forEach((product) => {
			formData.append('productsIds', product.id)
		})

		fetcher.submit(formData, { method: 'post' })
	}

	useEffect(() => {
		if (fetcher.data?.result.status === 'success' && fetcher.state === 'idle') {
			setSelectedProducts([])
			setOriginCategory(destinationCategory.value || '')
			setSearchParams({ 'origin-category-id': destinationCategory.value || '' })
			destinationCategory.change('')
			setSearchQuery('')

			toast.success('Productos transferidos con éxito')
		}
	}, [fetcher.data, fetcher.state])

	return (
		<ContentLayout title={`Transferencia de productos`}>
			<div className="flex flex-col gap-4">
				<main className="grid gap-4 sm:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle>Categoría Origen</CardTitle>
							<div className="flex flex-col  gap-4 sm:flex-row">
								<Select
									name={'origin-category-id'}
									value={originCategory}
									onValueChange={handleOriginCategoryChange}
								>
									<SelectTrigger className="w-full sm:max-w-[15rem]">
										<SelectValue placeholder="Seleccione una categoría" />
									</SelectTrigger>
									<SelectContent>
										{businessCategories.map((category) => (
											<SelectItem key={category.id} value={category.id}>
												{category.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{selectedOriginCategory && (
									<div className="flex w-full flex-1  items-center">
										<div className="relative w-full">
											<Input
												autoFocus
												className="w-full  pr-[3rem] "
												type="text"
												placeholder={`Buscar productos en ${selectedOriginCategory.name}`}
												value={searchQuery}
												onChange={(e) => setSearchQuery(e.target.value)}
											/>
											<Icon
												name="magnifying-glass"
												className="absolute bottom-1/2 right-4 translate-y-1/2 transform"
											/>
										</div>
									</div>
								)}
							</div>
						</CardHeader>
						<CardContent>
							{selectedOriginCategory && (
								<ScrollArea className="h-[25rem] rounded-md border p-3 ">
									{filteredOriginCategoryProducts?.map((product) => (
										<div
											onClick={() => handleProductSelect(product)}
											key={product.id}
											className={cn(
												'group mb-1 flex cursor-pointer items-center justify-between rounded-md border border-transparent px-2 py-1 transition-colors hover:bg-secondary/60',
												selectedProducts.some(
													(selectedProduct) =>
														selectedProduct.id === product.id,
												) && 'border-border bg-secondary',
											)}
										>
											<div className="text-sm">
												<div>{product.name}</div>
												<div className="text-sm text-muted-foreground">
													<Icon name="scan-barcode">{product.code}</Icon>
												</div>
											</div>
											<div>
												<Icon
													className={cn(
														'opacity-0 transition-all',
														selectedProducts.some(
															(selectedProduct) =>
																selectedProduct.id === product.id,
														) &&
															'opacity-100 group-hover:text-muted-foreground',
													)}
													name="circle-check"
													size="lg"
												/>
											</div>
										</div>
									))}
								</ScrollArea>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Productos Seleccionados</CardTitle>
							<CardDescription>
								{selectedProducts.length} producto(s) seleccionado(s).
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ScrollArea className="h-[26rem] rounded-md border p-3 ">
								{selectedProducts?.map((product) => (
									<div
										onClick={() => handleProductSelect(product)}
										key={product.id}
										className={cn(
											'group mb-1 flex cursor-pointer items-center justify-between rounded-md border border-transparent px-2 py-1 transition-colors hover:bg-secondary/60',
										)}
									>
										<div className="flex-1 text-sm">
											<div>{product.name}</div>
											<div className=" text-muted-foreground">
												<Icon name="scan-barcode">{product.code}</Icon>
											</div>
										</div>
										<div className="flex items-center gap-4">
											<div>
												<Badge variant={'outline'}>
													{product.category.name}
												</Badge>
											</div>
											<div>
												<Icon
													className={cn(
														'text-destructive opacity-0 transition-all',
														selectedProducts.some(
															(selectedProduct) =>
																selectedProduct.id === product.id,
														) && 'group-hover:opacity-100 ',
													)}
													name="cross-1"
													size="lg"
												/>
											</div>
										</div>
									</div>
								))}
							</ScrollArea>
						</CardContent>
					</Card>
				</main>
				<div className="flex w-full flex-col items-center justify-between gap-4 rounded-md bg-card p-4 sm:flex-row sm:gap-8">
					<Select
						name={fields.destinationCategoryId.name}
						value={destinationCategory.value}
						onValueChange={destinationCategory.change}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Seleccione una categoría de destino" />
						</SelectTrigger>
						<SelectContent>
							{businessCategories.map((category) => (
								<SelectItem key={category.id} value={category.id}>
									{category.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<StatusButton
						form={form.id}
						className="h-9 w-full sm:w-fit"
						size={'wide'}
						onClick={handleSubmit}
						variant="default"
						status={isPending ? 'pending' : (form.status ?? 'idle')}
						disabled={
							isPending ||
							!destinationCategory.value ||
							selectedProducts.length === 0
						}
						iconName="transfer"
					>
						<div className="flex items-center gap-1 ">
							<span>
								{isPending ? 'Transferiendo...' : 'Transferir Productos'}
							</span>
						</div>
					</StatusButton>
				</div>
			</div>

			<BlockerDialog blockCondition={selectedProducts.length > 0} />
		</ContentLayout>
	)
}

function BlockerDialog({ blockCondition }: { blockCondition: boolean }) {
	const blocker = useBlocker(
		({ currentLocation, nextLocation }) =>
			blockCondition && currentLocation.pathname !== nextLocation.pathname,
	)

	return (
		<>
			{blocker.state === 'blocked' && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in">
					<div className="w-full max-w-lg rounded-md bg-background p-4 shadow-lg">
						<div className="flex flex-col gap-4">
							<div className="text-lg font-medium">
								Perderá el progreso de la transferencia de productos
							</div>
							<div className="text-sm text-muted-foreground">
								Si abandona la transferencia de productos, perderá el progreso
								de la misma y tendrá que empezar desde cero.
							</div>
							<div className="flex gap-4">
								<Button onClick={() => blocker.reset()} variant={'outline'}>
									Volver
								</Button>
								<Button onClick={() => blocker.proceed()}>
									Abandonar y descartar transferencia
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
