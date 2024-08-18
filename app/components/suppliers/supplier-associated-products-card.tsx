import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'

import { LinkWithOrigin } from '#app/components/ui/link-origin.tsx'
import { useSupplier } from '#app/context/suppliers/SupplierContext.tsx'
import { useSearchParams } from '@remix-run/react'
import { useEffect } from 'react'

export function AssociatedProductsCard() {
	const { supplier } = useSupplier()
	const [_, setSearchParams] = useSearchParams()

	//We clean up search params when the component is mounted in case we are coming from the inventory page
	useEffect(() => {
		setSearchParams(new URLSearchParams())
	}, []);

	if (supplier.products.length === 0) {
		return (
			<Card className="h-fit">
				<CardHeader>
					<CardTitle>Sin Productos asociados</CardTitle>
					<CardDescription>
						Todavía no existen productos asociados al proveedor.
					</CardDescription>
				</CardHeader>
			</Card>
		)
	}

	return (
		<Card className="h-fit">
			<CardHeader>
				<CardTitle>Productos asociados</CardTitle>
				{supplier.products.length === 1 ? (
					<CardDescription>
						Existe {supplier.products.length} Producto asociado al proveedor.
					</CardDescription>
				) : (
					<CardDescription>
						Existen {supplier.products.length} Productos asociados al proveedor.
					</CardDescription>
				)}
			</CardHeader>
			<CardContent>
				<Button className="w-full" variant={'secondary'} asChild>
					<LinkWithOrigin
						unstable_viewTransition
						to={`/inventory?supplier=${supplier.id}`}
					>
						<Icon name="package">Gestionar productos en inventario</Icon>
					</LinkWithOrigin>
				</Button>
			</CardContent>
		</Card>
	)
}
