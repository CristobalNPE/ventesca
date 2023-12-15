import { useState } from 'react'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from './alert-dialog.tsx'
import { Button } from './button.tsx'
import { Icon } from './icon.tsx'

type SelectModalProps = {
	children?: React.ReactNode
	title: string
	selected?: string
}

const SelectModal = ({ title, children, selected }: SelectModalProps) => {
	return (
		<div className="flex items-center gap-2">
			<AlertDialog>
				<AlertDialogTrigger>
					<Button variant={'outline'}>
						<Icon name="magnifying-glass" className="mr-2" />
						{selected ? 'Cambiar' : 'Seleccionar'} {title}
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent className="max-w-xl">
					<AlertDialogHeader>
						<AlertDialogTitle>Búsqueda de {title}</AlertDialogTitle>
						<AlertDialogDescription>{children}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter className="mt-4">
						<AlertDialogCancel>
							Listo <Icon name="check" className="ml-2" />
						</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<span className="font-bold tracking-wider">{selected}</span>
		</div>
	)
}

export { SelectModal }
