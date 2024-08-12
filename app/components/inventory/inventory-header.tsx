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
import { RouteHeader } from '../route-header'

export function InventoryHeader({ isAdmin }: { isAdmin: boolean }) {
	return (
		<RouteHeader title="Administración de Inventario">
			{isAdmin && <InventoryOptions />}
		</RouteHeader>
	)
}

function InventoryOptions() {
	return (
		<div className="mt-4 flex w-full flex-col justify-between gap-4  md:flex-row-reverse lg:mt-0">
			<div className="flex w-full gap-1 ">
				<CreateItemDialog />
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button size={'sm'} className="h-7 w-6 gap-1 p-0 text-sm">
							<Icon name="dots-vertical" />
							<span className="sr-only">
								Mas opciones para ingresar productos
							</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem asChild>
							<Link to={'new-products'}>
								<Icon name="cube-plus" className="mr-2" /> Ingresar multiples
								productos
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={e => e.preventDefault()}>
							<ImportInventoryFromFileModal />
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<ModifyProductPriceInBulkModal />
			<Button
				asChild
				size={'sm'}
				className="h-7 gap-1 text-sm"
				variant={'outline'}
			>
				<a href={'/inventory/generate-inventory-template'}>
					<Icon name="file-arrow-right" size="sm" className="mr-2" />
					<span>Exportar datos de inventario</span>
				</a>
			</Button>
		</div>
	)
}
