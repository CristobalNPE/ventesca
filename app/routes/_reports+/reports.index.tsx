import { Icon } from '#app/components/ui/icon.tsx'

export default function ReportsIndexRoute() {
	return (
		<div className="hidden h-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-12 text-muted-foreground lg:flex">
			<Icon className="text-2xl" name="file-text" />
			<p className="text-xl">Seleccione un reporte para ver detalles.</p>
		</div>
	)
}
