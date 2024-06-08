import { Icon } from '#app/components/ui/icon.tsx'

export default function CategoriesIndexRoute() {
	return (
		<div className="hidden h-[85dvh] flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-12 text-muted-foreground lg:flex">
			<Icon className="text-2xl" name="file-text" />
			<p className="text-xl">Seleccione una categoría para ver detalles.</p>
		</div>
	)
}
