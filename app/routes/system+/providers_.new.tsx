import { Icon } from '#app/components/ui/icon.tsx'

import { ProviderEditor, action } from './__provider-editor.tsx'

export { action }

export default function CreateItem() {
	return (
		<div className="flex max-w-[35rem] flex-col  rounded-md bg-secondary">
			<div className="flex gap-4 rounded-t-md bg-primary/50 p-3 text-2xl">
				<Icon name="route" />
				<h1>Ingresar nuevo proveedor</h1>
			</div>
			<ProviderEditor />
		</div>
	)
}
