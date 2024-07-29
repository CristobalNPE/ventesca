import { Dropzone } from '#app/components/dropzone.tsx'
import { ErrorList } from '#app/components/forms.tsx'
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
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#app/components/ui/popover.js'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { action } from '#app/routes/_inventory+/inventory.tsx'
import { useIsPending } from '#app/utils/misc.tsx'
import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Form, useActionData } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
// export const importInventoryFromFileActionIntent = 'import-inventory-file'

export const ImportInventoryFromFileSchema = z.object({
	template: z.instanceof(File, { message: 'Debe cargar una plantilla.' }),
})

export function ImportInventoryFromFileModal() {
	const isPending = useIsPending()
	const actionData = useActionData<typeof action>()
	const [form, fields] = useForm({
		id: 'import-inventory-file',
		constraint: getZodConstraint(ImportInventoryFromFileSchema),
		lastResult: actionData?.result,

		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ImportInventoryFromFileSchema })
		},
	})

	const [fileImportedSuccessfully, setFileImportedSuccessfully] =
		useState(false)

	useEffect(() => {
		if (actionData?.result.status === 'success') {
			setFileImportedSuccessfully(true)
		}
	}, [actionData])

	const successfulProducts = actionData?.successfulProducts ?? []
	const productsWithErrors = actionData?.productsWithErrors ?? []
	const productsWithWarnings = actionData?.productsWithWarnings ?? []

	return (
		<AlertDialog>
			<AlertDialogTrigger>
				<Icon name="file-text" className="mr-2" /> Importar productos desde
				archivo
			</AlertDialogTrigger>
			{fileImportedSuccessfully ? (
				<AlertDialogContent className="max-w-3xl">
					<AlertDialogHeader>
						<AlertDialogTitle>
							Resultados registro de inventario
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<Accordion type="single" collapsible>
								<AccordionItem value="successful">
									<AccordionTrigger asChild>
										<ResultCard
											title={'Registros exitosos'}
											badgeCount={successfulProducts.length}
											icon={'circle-check'}
											variant={'success'}
										/>
									</AccordionTrigger>
									{successfulProducts.length ? (
										<AccordionContent className="px-2 ">
											<p className="mb-2 text-foreground">
												Productos registrados con éxito y se encuentran listos
												para la venta.
											</p>
											<div className="h-fit max-h-[15rem] overflow-y-auto rounded-md border">
												{successfulProducts.map((product, i) => {
													return (
														<div
															className="flex items-center justify-between gap-4 rounded-md border-b-2 border-secondary/50 px-3 py-1 text-xs hover:bg-secondary/50 hover:text-foreground"
															key={i}
														>
															<div className="flex flex-col ">
																<div className="flex items-center gap-1 text-muted-foreground">
																	<Icon name="scan-barcode" />
																	{product.code}
																</div>
																<div>{product.name}</div>
															</div>
															<div className=" flex items-center gap-1 text-sm text-green-600">
																<Icon name="circle-check" size="sm" />
															</div>
														</div>
													)
												})}
											</div>
										</AccordionContent>
									) : null}
								</AccordionItem>
								<AccordionItem value="warning">
									<AccordionTrigger asChild>
										<ResultCard
											title={'Registros con problemas'}
											badgeCount={productsWithWarnings.length}
											icon={'exclamation-circle'}
											variant={'warning'}
										/>
									</AccordionTrigger>
									{productsWithWarnings.length ? (
										<AccordionContent>
											<p className="mb-2 text-foreground">
												Productos registrados con problemas menores. Se
												aplicaron valores por defecto y necesitan revisión antes
												de su activación.
											</p>
											<div className="h-fit max-h-[15rem] overflow-y-auto rounded-md border">
												{productsWithWarnings.map((productWithWarning, i) => {
													return (
														<div
															className="flex items-center justify-between gap-4 rounded-md border-b-2 border-secondary/50 px-3 py-1 text-xs hover:bg-secondary/50 hover:text-foreground"
															key={i}
														>
															<div className="flex flex-col ">
																<div className="flex items-center gap-1 text-muted-foreground">
																	<Icon name="scan-barcode" />
																	{productWithWarning.parsedProduct.code}
																</div>
																<div>
																	{productWithWarning.parsedProduct.name}
																</div>
															</div>
															<div className="hidden items-center gap-1 text-sm sm:flex">
																<Icon name="question-mark-circled" size="sm" />
																<span className="text-xs">
																	{productWithWarning.message}
																</span>
															</div>
															<div className="flex sm:hidden">
																<Popover>
																	<PopoverTrigger>
																		<Icon
																			name="question-mark-circled"
																			size="lg"
																		/>
																	</PopoverTrigger>
																	<PopoverContent className="text-sm">
																		{productWithWarning.message}
																	</PopoverContent>
																</Popover>
															</div>
														</div>
													)
												})}
											</div>
										</AccordionContent>
									) : null}
								</AccordionItem>
								<AccordionItem value="error">
									<AccordionTrigger asChild>
										<ResultCard
											title={'Registros con error'}
											badgeCount={productsWithErrors.length}
											icon={'alert-triangle'}
											variant={'error'}
										/>
									</AccordionTrigger>
									{productsWithErrors.length ? (
										<AccordionContent>
											<p className="mb-2 text-foreground">
												Productos no pudieron ser registrados debido a errores
												críticos. Se requiere revisión de plantilla.
											</p>
											<div className="h-fit max-h-[15rem] overflow-y-auto rounded-md border">
												{productsWithErrors.map((productWithErrors, i) => (
													<div
														className="flex items-center justify-between gap-4 rounded-md border-b-2 border-secondary/50 px-3 py-1 text-xs hover:bg-secondary/50 hover:text-foreground"
														key={i}
													>
														<div className="flex flex-col ">
															<div className="flex items-center gap-1 text-muted-foreground">
																<Icon name="scan-barcode" />
																{productWithErrors.parsedProduct.code}
															</div>
															<div>{productWithErrors.parsedProduct.name}</div>
														</div>
														<div className="hidden items-center gap-1 text-sm sm:flex">
															<Icon name="question-mark-circled" size="sm" />
															<span className="text-xs">
																{productWithErrors.message}
															</span>
														</div>
														<div className="flex sm:hidden">
															<Popover>
																<PopoverTrigger>
																	<Icon
																		name="question-mark-circled"
																		size="lg"
																	/>
																</PopoverTrigger>
																<PopoverContent className="text-sm">
																	{productWithErrors.message}
																</PopoverContent>
															</Popover>
														</div>
													</div>
												))}
											</div>
										</AccordionContent>
									) : null}
								</AccordionItem>
							</Accordion>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction
							onClick={() =>
								setTimeout(() => setFileImportedSuccessfully(false), 500)
							}
						>
							Entendido
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			) : (
				<AlertDialogContent className="max-w-2xl">
					<AlertDialogHeader>
						<AlertDialogTitle>
							Importar inventario desde archivo
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="flex flex-col gap-4">
								<p>
									Registre multiples productos desde un archivo según
									instrucciones:
								</p>

								<div className="flex flex-col items-center gap-2  sm:flex-row sm:gap-6">
									<li className="flex-1">
										Descargue la plantilla de inventario:
									</li>
									<Button
										asChild
										size={'sm'}
										variant={'secondary'}
										className="w-[15rem]"
									>
										<a href={'/inventory/generate-inventory-template'}>
											<Icon
												name="file-arrow-right"
												size="sm"
												className="mr-2"
											/>
											<span>Descargar Plantilla</span>
										</a>
									</Button>
								</div>
								<li>Complete los datos necesarios.</li>
								<div className="flex flex-col gap-6 ">
									<li className="">
										Suba el archivo con los datos ingresados.
									</li>
									<Form
										{...getFormProps(form)}
										// id={form.id}
										method="POST"
										encType="multipart/form-data"
										className="flex  items-center gap-4"
									>
										<Dropzone
											name={fields.template.name}
											acceptLabel="XLSX (Usar plantilla)"
											accept=".xlsx"
										/>
										{/* <input
											accept=".xlsx"
											{...getInputProps(fields.template, { type: 'file' })}
						
										/> */}
										<ErrorList id={form.id} errors={fields.template.errors} />
									</Form>
								</div>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>

					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<StatusButton
							type="submit"
							// name="intent"
							// value={importInventoryFromFileActionIntent}
							status={isPending ? 'pending' : form.status ?? 'idle'}
							disabled={isPending}
							form={form.id}
							iconName="upload"
						>
							Cargar Inventario
						</StatusButton>
					</AlertDialogFooter>
				</AlertDialogContent>
			)}
		</AlertDialog>
	)
}
