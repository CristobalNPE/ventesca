import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { format } from '@validatecl/rut'
import { useState } from 'react'

import { useFetcher } from '@remix-run/react'
import { SelectModal } from '#app/components/ui/select-modal.tsx'
import { Input } from '#app/components/ui/input.tsx'

export type SelectedSupplier = {
	id: string
	fantasyName: string
}

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)
	const url = new URL(request.url)
	const query = url.searchParams.get('query')
	// invariant(query, 'query is required')

	const suppliers = await prisma.provider.findMany({
		where: {
			OR: [
				{ rut: { contains: query ?? '' } },
				{ fantasyName: { contains: query ?? '' } },
			],
		},
		select: {
			id: true,
			name: true,
			fantasyName: true,
			rut: true,
		},
		orderBy: { fantasyName: 'asc' },
	})

	return json({ suppliers })
}

// export function SupplierCombobox({
// 	selectedSupplier,
// 	setSelectedSupplier,
// }: {
// 	selectedSupplier: string
// 	setSelectedSupplier: (value: string) => void
// }) {
// 	const supplierFetcher = useFetcher<typeof loader>({
// 		key: 'suppliers-combobox',
// 	})

// 	console.log(selectedSupplier)
// 	const suppliers = supplierFetcher.data?.suppliers
// 	const [open, setOpen] = useState(false)
// 	const [search, setSearch] = useState('')

// 	useEffect(() => {
// 		supplierFetcher.submit(
// 			{
// 				query: search ?? '',
// 			},
// 			{
// 				method: 'GET',
// 				action: '/resources/suppliers',
// 			},
// 		)
// 		// eslint-disable-next-line react-hooks/exhaustive-deps
// 	}, [search])

// 	return (
// 		<Popover open={open} onOpenChange={setOpen}>
// 			<PopoverTrigger asChild>
// 				<Button
// 					variant="outline"
// 					role="combobox"
// 					aria-expanded={open}
// 					className="w-full justify-between uppercase"
// 				>
// 					{selectedSupplier
// 						? suppliers?.find(supplier => supplier.id === selectedSupplier)
// 								?.fantasyName
// 						: 'Seleccione proveedor...'}

// 					<Icon
// 						name="arrow-up-down"
// 						className="ml-2 h-4 w-4 shrink-0 opacity-50"
// 					/>
// 				</Button>
// 			</PopoverTrigger>
// 			<PopoverContent className="w-full p-0">
// 				<Command onValueChange={value => setSearch(value)}>
// 					<CommandInput placeholder="Buscar Proveedor..." />
// 					<CommandEmpty>Sin resultados.</CommandEmpty>
// 					<CommandGroup>
// 						{suppliers?.map(supplier => (
// 							<CommandItem
// 								key={supplier.id}
// 								value={supplier.id}
// 								className={'flex justify-between gap-10'}
// 								onSelect={currentValue => {
// 									setSelectedSupplier(
// 										currentValue === selectedSupplier ? '' : currentValue,
// 									)
// 									setOpen(false)
// 								}}
// 							>
// 								<span className='text-muted-foreground font-semibold'>{formatChileanRUT(supplier.rut)}</span>
// 								<span className='font-semibold'>{supplier.fantasyName}</span>
// 							</CommandItem>
// 						))}
// 					</CommandGroup>
// 				</Command>
// 			</PopoverContent>
// 		</Popover>
// 	)
// }

export function SupplierSelectBox({
	newSelectedSupplier,
	setNewSelectedSupplier,
}: {
	newSelectedSupplier: SelectedSupplier | null
	setNewSelectedSupplier: React.Dispatch<React.SetStateAction<SelectedSupplier | null>>
}) {
	const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
	const supplierFetcher = useFetcher<typeof loader>({
		key: 'supplier-selectBox',
	})

	const suppliers = supplierFetcher.data?.suppliers ?? []
	// const [selectedSupplier, setSelectedSupplier] = useState<
	// 	(typeof suppliers)[0] | null
	// >(null)

	return (
		<SelectModal
			open={supplierDialogOpen}
			onOpenChange={setSupplierDialogOpen}
			title="Proveedor"
			selected={newSelectedSupplier?.fantasyName}
		>
			<Input
				autoFocus
				type="text"
				className="mb-4 w-full"
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					supplierFetcher.submit(
						{ query: e.target.value },
						{ method: 'GET', action: '/resources/suppliers' },
					)
				}
			/>
			<div className="flex max-h-[15rem] flex-col gap-1 overflow-auto">
				{suppliers.length !== 0 ? (
					suppliers.map(supplier => (
						<div
							key={supplier.id}
							className="text-md flex cursor-pointer items-center gap-2 rounded-sm p-1 hover:bg-primary/20"
							onClick={() => {
								setNewSelectedSupplier(supplier)
								supplierFetcher.submit(
									{ query: '' },
									{ method: 'GET', action: '/resources/suppliers' },
								)
								console.log(`Setted ${newSelectedSupplier}`)
								setSupplierDialogOpen(false)
							}}
						>
							<span className="w-[7rem] font-semibold text-muted-foreground">
								{format(supplier.rut)}
							</span>{' '}
							<span className="border-l-2 pl-2">{supplier.fantasyName}</span>
						</div>
					))
				) : (
					<div className="text-md flex items-center">Sin coincidencias.</div>
				)}
			</div>
		</SelectModal>
	)
}
