import { ErrorList, Field } from '#app/components/forms.tsx'
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
import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import { z } from 'zod'
import {
	PRODUCT_NAME_MAX,
	PRODUCT_NAME_MIN,
} from '../../routes/_inventory+/inventory_.$productId.edit'
import { action } from '../../routes/_inventory+/inventory.edit'

export const createSingleProductActionIntent = 'create-product-single'

export const CreateItemSchema = z.object({
	intent: z.literal(createSingleProductActionIntent),
	productId: z.string().optional(),
	name: z
		.string({
			required_error: 'Campo obligatorio',
		})
		.min(PRODUCT_NAME_MIN, {
			message: 'El nombre debe contener al menos 3 caracteres.',
		})
		.max(PRODUCT_NAME_MAX, {
			message: `El nombre no puede ser mayor a ${PRODUCT_NAME_MAX} caracteres.`,
		}),
	code: z.string({
		required_error: 'Campo obligatorio',
	}),
})

export function CreateItemDialog() {
	const createItemFetcher = useFetcher<typeof action>({
		key: `${createSingleProductActionIntent}`,
	})
	const actionData = createItemFetcher.data
	const isPending = createItemFetcher.state !== 'idle'

	const [form, fields] = useForm({
		id: 'create-item',
		constraint: getZodConstraint(CreateItemSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CreateItemSchema })
		},
	})

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button size={'pill'} className="h-7 gap-1 text-sm w-full">
					<Icon name="plus" size="md" />
					<span>Agregar articulo</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Agregar Articulo</AlertDialogTitle>
					<AlertDialogDescription>
						Complete la información para registrar el nuevo articulo en
						inventario.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<createItemFetcher.Form
					method="POST"
					action="/inventory/edit"
					{...getFormProps(form)}
				>
					<div className="flex flex-col gap-4 sm:flex-row">
						<Field
							labelProps={{ children: 'Código único' }}
							inputProps={{
								autoFocus: true,

								...getInputProps(fields.code, {
									type: 'number',
									ariaAttributes: true,
								}),
							}}
							errors={fields.code.errors}
						/>
						<Field
							className="grow"
							labelProps={{ children: 'Nombre del producto' }}
							inputProps={{
								...getInputProps(fields.name, {
									type: 'text',
									ariaAttributes: true,
								}),
							}}
							errors={fields.name.errors}
						/>
					</div>
					<ErrorList id={form.errorId} errors={form.errors} />
				</createItemFetcher.Form>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>

					<StatusButton
						form={form.id}
						type="submit"
						disabled={isPending}
						status={isPending ? 'pending' : 'idle'}
					>
						<Icon name="check" className="mr-2" />
						Registrar Articulo
					</StatusButton>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
