import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Link } from '@remix-run/react'
import { ModifyProductPriceInBulkModal } from './inventory-bulk-price-modify-modal'
import { ImportInventoryFromFileModal } from './inventory-import'
import { CreateItemDialog } from './product-create-single'

export function InventoryHeader({ isAdmin }: { isAdmin: boolean }) {
	return (
		<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center lg:flex-row lg:text-left">
			<h1 className="text-xl font-semibold">Administración de Inventario</h1>
			{isAdmin ? (
				<div className="mt-4 flex w-full flex-col gap-2 lg:mt-0 lg:max-w-[25rem] lg:flex-row-reverse">
					<div className="flex w-full gap-1 ">
						<CreateItemDialog />
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button size={'sm'} className="w-6 p-0">
									<Icon name="dots-vertical" />
									<span className="sr-only">
										Mas opciones para ingresar productos
									</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuItem asChild>
									<Link to={'new-products'}>
										<Icon name="cube-plus" className="mr-2" /> Ingresar
										multiples productos
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={e => e.preventDefault()}>
									<ImportInventoryFromFileModal />
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<ModifyProductPriceInBulkModal />
					<Button asChild size={'sm'} variant={'outline'}>
						<a href={'/inventory/generate-inventory-template'}>
							<Icon name="file-arrow-right" size="sm" className="mr-2" />
							<span>Exportar datos de inventario</span>
						</a>
					</Button>
				</div>
			) : null}
		</div>
	)
}
