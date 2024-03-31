import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { formatChileanRUT, invariant } from '#app/utils/misc.tsx'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Button } from '#app/components/ui/button.tsx'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from '#app/components/ui/command.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#app/components/ui/popover.tsx'
import { useEffect, useState } from 'react'
import { useFetcher } from '@remix-run/react'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)

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

export function SupplierCombobox({
	selectedSupplier,
	setSelectedSupplier,
}: {
	selectedSupplier: string
	setSelectedSupplier: (value: string) => void
}) {
	const supplierFetcher = useFetcher<typeof loader>({
		key: 'suppliers-combobox',
	})

	console.log(selectedSupplier)
	const suppliers = supplierFetcher.data?.suppliers
	const [open, setOpen] = useState(false)

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="w-full justify-between uppercase"
				>
					{selectedSupplier
						? suppliers?.find(supplier => supplier.fantasyName === selectedSupplier)
								?.fantasyName
						: 'Seleccione proveedor...'}

					<Icon
						name="arrow-up-down"
						className="ml-2 h-4 w-4 shrink-0 opacity-50"
					/>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-full p-0">
				<Command>
					<CommandInput placeholder="Buscar Proveedor..." />
					<CommandEmpty>Sin resultados.</CommandEmpty>
					<CommandGroup>
						{suppliers?.map(supplier => (
							<CommandItem
								key={supplier.id}
								value={supplier.fantasyName}
								className={'flex justify-between gap-10'}
								onSelect={currentValue => {
									setSelectedSupplier(
										currentValue === selectedSupplier ? '' : currentValue,
									)
									setOpen(false)
								}}
							>
								<span className="font-semibold text-muted-foreground">
									{formatChileanRUT(supplier.rut)}
								</span>
								<span className="font-semibold">{supplier.fantasyName}</span>
							</CommandItem>
						))}
					</CommandGroup>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
