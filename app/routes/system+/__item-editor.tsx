import { ErrorList, Field } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { type Item } from '@prisma/client'
import {
	json,
	redirect,
	type ActionFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'

const nameMinLength = 1
const nameMaxLength = 100

const ItemEditorSchema = z.object({
	id: z.string().optional(),
	code: z.number().min(1),
	name: z.string().min(nameMinLength).max(nameMaxLength),
	price: z.number().min(0),
	sellingPrice: z.number().min(0),
	stock: z.number().min(0),
	categoryId: z.string(),
	providerId: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
	// const userId = await requireUserId(request)

	const formData = await request.formData()
	await validateCSRF(formData, request.headers)

	const submission = await parse(formData, {
		schema: ItemEditorSchema.superRefine(async (data, ctx) => {
			if (!data.id) return

			const item = await prisma.item.findUnique({
				select: { id: true },
				where: { id: data.id } /* we selected ownerId too here !! OMG*/,
			})
			if (!item) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'No se encuentra articulo.',
				})
			}
		}),
		async: true,
	})

	if (submission.intent !== 'submit') {
		return json({ submission } as const)
	}

	if (!submission.value) {
		return json({ submission } as const, { status: 400 })
	}

	const {
		id: itemId,
		code,
		name,
		price,
		sellingPrice,
		stock,
		providerId,
		categoryId,
	} = submission.value

	console.log({ submission })

	const updatedItem = await prisma.item.upsert({
		select: { id: true },
		where: { id: itemId ?? '__new_item__' },
		create: {
			code,
			name,
			price,
			sellingPrice,
			stock,
			provider: { connect: { id: providerId } }, //
			family: { connect: { id: categoryId } }, //
		},
		update: {
			code,
			name,
			price,
			sellingPrice,
			stock,

			//how to handle update? change of provider or family?
		},
	})

	return redirect(`/system/inventory/${updatedItem.id}`)
}

export function ItemEditor({
	item,
	providerId,
	categoryId,
}: {
	item?: SerializeFrom<
		Pick<Item, 'id' | 'code' | 'name' | 'price' | 'sellingPrice' | 'stock'>
	>
	providerId: string
	categoryId: string
}) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()

	//here we have to make sure that the CODE is unique so prisma doesn't throw an error
	const [form, fields] = useForm({
		id: 'item-editor',
		constraint: getFieldsetConstraint(ItemEditorSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: ItemEditorSchema })
		},
		defaultValue: {
			code: item?.code ?? '',
			name: item?.name ?? '',
			price: item?.price ?? '',
			sellingPrice: item?.sellingPrice ?? '',
			stock: item?.stock ?? '',
			providerId,
			categoryId,
		},
	})

	return (
		<div className="mt-2 w-full">
			<Form method="POST" className="flex  flex-col gap-y-3" {...form.props}>
				<AuthenticityTokenInput />
				{item ? <input type="hidden" name="id" value={item.id} /> : null}

				<div className="flex flex-col gap-1">
					<Field
						labelProps={{ children: 'Código' }}
						inputProps={{
							autoFocus: true,
							...conform.input(fields.code, { ariaAttributes: true }),
						}}
						errors={fields.code.errors}
					/>
					<Field
						labelProps={{ children: 'Nombre / Descripción' }}
						inputProps={{
							...conform.input(fields.name, { ariaAttributes: true }),
						}}
						errors={fields.name.errors}
					/>
					<Field
						labelProps={{ children: 'Valor' }}
						inputProps={{
							...conform.input(fields.price, { ariaAttributes: true }),
						}}
						errors={fields.price.errors}
					/>
					<Field
						labelProps={{ children: 'Precio de Venta' }}
						inputProps={{
							...conform.input(fields.sellingPrice, { ariaAttributes: true }),
						}}
						errors={fields.sellingPrice.errors}
					/>
					<Field
						labelProps={{ children: 'Stock' }}
						inputProps={{
							...conform.input(fields.stock, { ariaAttributes: true }),
						}}
						errors={fields.stock.errors}
					/>
					<input {...conform.input(fields.providerId, { type: 'hidden' })} />
					<input {...conform.input(fields.categoryId, { type: 'hidden' })} />
				</div>
				<div className="flex gap-4"></div>
				<ErrorList id={form.errorId} errors={form.errors} />
			</Form>
			<div className=" flex justify-between">
				<Button form={form.id} variant="ghost" type="reset">
					Restaurar
				</Button>
				<StatusButton
					form={form.id}
					type="submit"
					disabled={isPending || providerId === '' || categoryId === ''}
					status={isPending ? 'pending' : 'idle'}
				>
					<Icon name="check" className="mr-2" /> Crear Articulo
				</StatusButton>
			</div>
		</div>
	)
}
