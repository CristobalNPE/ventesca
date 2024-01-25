import { Icon } from '#app/components/ui/icon.tsx'
import { DiscountsEditor, action } from './__discounts-editor.tsx'


export { action }



export default function CreateDiscount() {

	return (
		<div className="flex max-w-[36.5rem] flex-col  rounded-md bg-secondary">
			<div className="flex gap-4 rounded-t-md bg-primary p-3 text-2xl text-background">
				<Icon name="route" />
				<h1>Registrar nuevo descuento</h1>
			</div>
			<DiscountsEditor  />
		</div>
	)
}
