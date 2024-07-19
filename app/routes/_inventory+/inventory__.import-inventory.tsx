import {
	AlertDialog,
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
import { StatusButton } from '#app/components/ui/status-button.tsx'

import { Dropzone } from '#app/components/dropzone.tsx'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Form, useActionData } from '@remix-run/react'
import { z } from 'zod'
import { useIsPending } from '#app/utils/misc.tsx'
import { action } from '#app/routes/_inventory+/inventory.tsx'
import { ErrorList } from '#app/components/forms.tsx'
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

	return (
		<AlertDialog>
			<AlertDialogTrigger>
				<Icon name="file-text" className="mr-2" /> Importar productos desde
				archivo
			</AlertDialogTrigger>
			<AlertDialogContent className="max-w-2xl">
				<AlertDialogHeader>
					<AlertDialogTitle>Importar inventario desde archivo</AlertDialogTitle>
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
										<Icon name="file-arrow-right" size="sm" className="mr-2" />
										<span>Descargar Plantilla</span>
									</a>
								</Button>
							</div>
							<li>Complete los datos necesarios.</li>
							<div className="flex flex-col gap-6 ">
								<li className="">Suba el archivo con los datos ingresados.</li>
								<Form
									{...getFormProps(form)}
									// id={form.id}
									method="POST"
									encType="multipart/form-data"
									className="flex  items-center gap-4"
								>
									{/* <Dropzone
										name={fields.template.name}
						
										acceptLabel="XLSX (Usar plantilla)"
										accept=".xlsx"
									/> */}
									<input
										accept=".xlsx"
										{...getInputProps(fields.template, { type: 'file' })}
										// type='file'
									/>
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
		</AlertDialog>
	)
}
