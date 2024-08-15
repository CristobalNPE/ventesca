import JsBarcode from 'jsbarcode'
import { useEffect, useState } from 'react'
import { ResultCard } from '#app/components/result-card.tsx'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '#app/components/ui/accordion.tsx'
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
import { cn } from '#app/utils/misc.tsx'

export default function Page() {
	const [barcode, setBarcode] = useState('')
	useEffect(() => {
		let canvas
		canvas = document.createElement(`canvas`)
		JsBarcode(canvas, 'somerandomnumber')
		setBarcode(canvas.toDataURL())
	}, [])

	return (
		<div>
			Hello
			{/* <ReactBarcode value="6666s" /> */}
			<img src={barcode} />
			<AlertDialog>
				<AlertDialogTrigger>Open</AlertDialogTrigger>
				<AlertDialogContent className={cn('max-w-3xl')}>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<Accordion type="single" collapsible>
								<AccordionItem value="successful">
									<AccordionTrigger asChild>
										<ResultCard
											title={'Registros exitosos'}
											badgeCount={23}
											icon={'circle-check'}
											variant={'success'}
										/>
									</AccordionTrigger>
									<AccordionContent className="px-2 ">
										<p className="mb-2 text-foreground">
											Productos registrados con éxito y se encuentran listos
											para la venta.
										</p>
										<div className="h-[15rem] overflow-y-auto rounded-md border">
											Yes. It adheres to the WAI-ARIA design pattern.
										</div>
									</AccordionContent>
								</AccordionItem>
								<AccordionItem value="warning">
									<AccordionTrigger asChild>
										<ResultCard
											title={'Registros con problemas'}
											badgeCount={9}
											icon={'exclamation-circle'}
											variant={'warning'}
										/>
									</AccordionTrigger>
									<AccordionContent>
										<p className="mb-2 text-foreground">
											Productos registrados con problemas menores. Se aplicaron
											valores por defecto y necesitan revisión antes de su
											activación.
										</p>
										<div className="h-[15rem] overflow-y-auto rounded-md border">
											Yes. It adheres to the WAI-ARIA design pattern.
										</div>
									</AccordionContent>
								</AccordionItem>
								<AccordionItem value="error">
									<AccordionTrigger asChild>
										<ResultCard
											title={'Registros con error'}
											badgeCount={9}
											icon={'alert-triangle'}
											variant={'error'}
										/>
									</AccordionTrigger>
									<AccordionContent>
										<p className="mb-2 text-foreground">
											Productos no pudieron ser registrados debido a errores
											críticos. Se requiere revisión de plantilla.
										</p>
										<div className="h-[15rem] overflow-y-auto rounded-md border">
											Yes. It adheres to the WAI-ARIA design pattern.
										</div>
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction>Continue</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

