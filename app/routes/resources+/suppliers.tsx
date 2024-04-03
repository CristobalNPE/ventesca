import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import { format } from '@validatecl/rut'
import { useState } from 'react'

import { Input } from '#app/components/ui/input.tsx'
import { SelectModal } from '#app/components/ui/select-modal.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'

export type SelectedSupplier = {
	id: string
	fantasyName: string
}

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)
	const url = new URL(request.url)
	const query = url.searchParams.get('query')

	if (!query) {
		const suppliers = await prisma.provider.findMany({
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

	const suppliers = await prisma.provider.findMany({
		where: {
			OR: [{ rut: { contains: query } }, { fantasyName: { contains: query } }],
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

export function SupplierSelectBox({
	newSelectedSupplier,
	setNewSelectedSupplier,
}: {
	newSelectedSupplier: SelectedSupplier | null
	setNewSelectedSupplier: React.Dispatch<
		React.SetStateAction<SelectedSupplier | null>
	>
}) {
	const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
	const supplierFetcher = useFetcher<typeof loader>({
		key: 'supplier-selectBox',
	})

	const suppliers = supplierFetcher.data?.suppliers ?? []

	return (
		<SelectModal
			open={supplierDialogOpen}
			onOpenChange={setSupplierDialogOpen}
			title="nuevo Proveedor"
			selected={newSelectedSupplier?.fantasyName}
		>
			<Input
				autoFocus
				placeholder="Ingrese RUT o nombre"
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
				{suppliers.map(supplier => (
					<div
						key={supplier.id}
						className="text-md flex cursor-pointer items-center gap-2 rounded-sm p-1 hover:bg-primary/20"
						onClick={() => {
							setNewSelectedSupplier(supplier)
							supplierFetcher.submit(
								{ query: '' },
								{ method: 'GET', action: '/resources/suppliers' },
							)

							setSupplierDialogOpen(false)
						}}
					>
						<span className="w-[7rem] font-semibold text-muted-foreground">
							{format(supplier.rut)}
						</span>{' '}
						<span className="border-l-2 pl-2">{supplier.fantasyName}</span>
					</div>
				))}
			</div>
		</SelectModal>
	)
}
