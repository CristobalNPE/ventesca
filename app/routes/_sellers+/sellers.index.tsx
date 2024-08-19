import { Icon } from '#app/components/ui/icon.tsx'

export default function SellersIndexRoute() {
	return (
		<div className="hidden h-[85dvh] flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-12 text-muted-foreground lg:flex bg-card">
			<Icon className="text-2xl" name="file-text" />
			<p className="text-xl">Seleccione un vendedor para ver detalles.</p>
		</div>
	)
}
