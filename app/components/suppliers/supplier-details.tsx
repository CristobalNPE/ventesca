import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { format as formatRut } from '@validatecl/rut'
import { format, formatRelative, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

import { CardContentItem } from '#app/components/card-content-item.tsx'
import { useSupplier } from '#app/context/suppliers/SupplierContext.tsx'

export function SupplierDetails() {
	const { supplier } = useSupplier()

	return (
		<Card className="flex min-h-[27rem] flex-col ">
			<CardHeader className="flex flex-row items-center justify-between ">
				<CardTitle>Detalles del Proveedor</CardTitle>
			</CardHeader>
			<CardContent className="grid flex-1 gap-6">
				<CardContentItem
					icon={'hash'}
					title={'Código'}
					content={supplier.code.toString().padStart(3, '0')}
				/>
				<CardContentItem
					icon={'briefcase'}
					title={'Nombre Proveedor'}
					content={supplier.fantasyName}
				/>

				<CardContentItem
					icon={'user'}
					title={'Representante'}
					content={supplier.name}
				/>

				<CardContentItem
					icon={'id-badge-2'}
					title={'RUT'}
					content={formatRut(supplier.rut) ?? supplier.rut}
				/>

				<CardContentItem
					icon={'map'}
					title={'Dirección'}
					content={supplier.address}
				/>
				<CardContentItem
					icon={'map-pin-filled'}
					title={'Ciudad'}
					content={supplier.city}
				/>
				<CardContentItem
					icon={'phone'}
					title={'Teléfono'}
					content={supplier.phone}
				/>
				<CardContentItem
					icon={'envelope-closed'}
					title={'Correo Electrónico'}
					content={supplier.email}
				/>
				<CardContentItem
					icon={'calendar'}
					title={'Fecha registro'}
					content={format(supplier.createdAt, "dd'/'MM'/'yyyy 'a las' HH:MM", {
						locale: es,
					})}
				/>
			</CardContent>
			<CardFooter className="flex flex-col-reverse items-center justify-end gap-4 border-t bg-muted/50 px-6 py-3 text-muted-foreground  sm:flex-row">
				<span className="flex items-center gap-1 text-xs">
					<Icon size="sm" name="clock" /> Última modificación{' '}
					{formatRelative(subDays(supplier.updatedAt, 0), new Date(), {
						locale: es,
					})}
				</span>
			</CardFooter>
		</Card>
	)
}
