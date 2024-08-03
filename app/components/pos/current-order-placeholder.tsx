import { Icon } from '../ui/icon'

export function CurrentOrderPlaceholder() {
	return (
		<div className="no-scrollbar flex h-[calc(100%-4rem)] flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-xl font-semibold text-muted-foreground">
			<Icon className="text-2xl" name="scan" />
			<h1 className="text-balance text-center">
				Ingrese el código de articulo para agregarlo a la transacción en curso.
			</h1>
		</div>
	)
}
