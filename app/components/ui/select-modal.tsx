import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
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
	open: boolean
	onOpenChange: (open: boolean) => void
}

const SelectModal = ({
	title,
	children,
	selected,
	open,
	onOpenChange,
}: SelectModalProps) => {
	return (
		<div className="flex items-center gap-3">
			<AlertDialog open={open} onOpenChange={onOpenChange}>
				<AlertDialogTrigger asChild>
					<Button
						className="flex grow items-center justify-start"
						variant={'outline'}
					>
						{selected ? (
							<Icon name="update" className="mr-2" />
						) : (
							<Icon name="magnifying-glass" className="mr-2" />
						)}
						{selected ? ` ${selected}` : `Seleccionar ${title}`}
					</Button>
				</AlertDialogTrigger>
				<AlertDialogContent className="max-w-xl">
					<AlertDialogHeader>
						<AlertDialogTitle>Búsqueda de {title}</AlertDialogTitle>
					</AlertDialogHeader>
					{children}
					<AlertDialogFooter className="mt-4">
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

export { SelectModal }
