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
}

const SelectModal = ({ title, children }: SelectModalProps) => {
	const [selected, setSelected] = useState('Selected Test')

	return (
		<div className="flex items-center gap-2">
			<AlertDialog>
				<AlertDialogTrigger>
					<Button variant={'secondary'}>
						<Icon name="magnifying-glass" className="mr-2" />
						{selected ? 'Cambiar' : 'Seleccionar'} {title}
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Búsqueda de {title}</AlertDialogTitle>
						<AlertDialogDescription>{children}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<span>{selected}</span>
		</div>
	)
}

export { SelectModal }
