import {
  Link
} from '@remix-run/react'
import {
  AlertDialog,
  AlertDialogAction,
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


export function ModifyProductPriceInBulkModal() {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button size={'sm'} className='h-7 gap-1 text-sm' variant={'outline'}>
					<Icon name="coin" size="sm" className="mr-2" />
					<span>Modificar precios</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent className="max-w-4xl">
				<AlertDialogHeader>
					<AlertDialogTitle>Modificar precios en lote</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción modificará los precios de venta de multiples productos
						en su inventario. Por favor, revise cuidadosamente los cambios antes
						de confirmar. Asegúrese de haber{' '}
						<span className="underline hover:font-black">respaldado</span> sus
						datos actuales, ya que esta acción no se puede deshacer fácilmente.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Link to="bulk-price-modify">Entendido, proceder.</Link>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}