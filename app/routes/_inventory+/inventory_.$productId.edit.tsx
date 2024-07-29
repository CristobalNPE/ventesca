import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardFooter,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon, IconName } from '#app/components/ui/icon.tsx'
import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useIsPending } from '#app/utils/misc.tsx'
import { invariantResponse } from '@epic-web/invariant'
import {
	ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react'
import { formatRelative, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

import { ErrorList, StyledField } from '#app/components/forms.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { shouldDeactivateProduct } from '#app/utils/inventory/product-status.js'
import { redirectWithToast } from '#app/utils/toast.server.js'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { z } from 'zod'

export const PRODUCT_NAME_MAX = 99
export const PRODUCT_NAME_MIN = 3
export const ProductDetailsEditorSchema = z.object({
	productId: z.string(),
	name: z
		.string({
			required_error: 'Campo obligatorio',
		})
		.min(PRODUCT_NAME_MIN, {
			message: `El nombre debe contener al menos ${PRODUCT_NAME_MIN} caracteres.`,
		})
		.max(PRODUCT_NAME_MAX, {
			message: `El nombre no puede ser mayor a ${PRODUCT_NAME_MAX} caracteres.`,
		}),
	code: z.string({
		required_error: 'Campo obligatorio',
	}),
	price: z
		.number({
			required_error: 'Campo obligatorio',
			invalid_type_error: 'Debe ser un número',
		})
		.min(0, { message: 'El valor no puede ser negativo.' }),
})

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const product = await prisma.product.findUnique({
		where: { id: params.productId, businessId },
	})

	invariantResponse(product, 'Not found', { status: 404 })

	return json({ product })
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)
	const formData = await request.formData()

	const submission = await parseWithZod(formData, {
		schema: ProductDetailsEditorSchema.superRefine(async (data, ctx) => {
			const productByCode = await prisma.product.findFirst({
				select: { id: true, code: true },
				where: { businessId, code: data.code, isDeleted: false },
			})

			if (productByCode && productByCode.id !== data.productId) {
				ctx.addIssue({
					path: ['code'],
					code: z.ZodIssueCode.custom,
					message: 'El código ya existe.',
				})
			}
		}),

		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { productId, code, name, price } = submission.value

	prisma.$transaction(async tx => {
		const updatedProduct = await tx.product.update({
			where: { id: productId },
			data: { code, name, price },
		})
		if (shouldDeactivateProduct(updatedProduct)) {
			await tx.product.update({
				where: { id: updatedProduct.id },
				data: { isActive: false },
			})
		}
	})

	return redirectWithToast(`/inventory/${productId}`, {
		type: 'success',
		title: 'Producto modificado',
		description: 'Detalles del producto modificados con éxito.',
	})
}

export default function ProductDetails() {
	const { product } = useLoaderData<typeof loader>()
	const actionData = useActionData<typeof action>()

	const isPending = useIsPending()
	const [form, fields] = useForm({
		id: `update-product-details-${product.id}`,
		constraint: getZodConstraint(ProductDetailsEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ProductDetailsEditorSchema })
		},
		defaultValue: {
			code: product.code,
			name: product.name,
			price: product.price,
		},
	})

	return (
		<Card>
			<div className="flex justify-between gap-4 p-6">
				<CardTitle>Modificar detalles del producto</CardTitle>
			</div>
			<CardContent className="mt-4 flex flex-col justify-start gap-2 ">
				<StyledField
					variant="slim"
					className="text-sm"
					icon={'id'}
					labelProps={{
						children: `Nombre`,
					}}
					inputProps={{
						...getInputProps(fields.name, {
							ariaAttributes: true,
							type: 'text',
						}),

						autoComplete: 'off',
					}}
					errors={fields.name.errors}
				/>
				<StyledField
					variant="slim"
					icon={'scan-barcode'}
					labelProps={{
						children: `Código`,
					}}
					inputProps={{
						...getInputProps(fields.code, {
							ariaAttributes: true,
							type: 'text',
						}),

						autoComplete: 'off',
					}}
					errors={fields.code.errors}
				/>
				<StyledField
					variant="slim"
					icon={'moneybag'}
					labelProps={{
						children: `Costo`,
					}}
					inputProps={{
						...getInputProps(fields.price, {
							ariaAttributes: true,
							type: 'text',
						}),

						autoComplete: 'off',
					}}
					errors={fields.price.errors}
				/>
				<Form method="post" {...getFormProps(form)}>
					<input type="hidden" name="productId" value={product.id} />
					<ErrorList errors={form.errors} id={form.errorId} />
					<div className="flex justify-between gap-4 ">
						<Button size={'sm'} asChild variant={'outline'}>
							<Link
								to={'..'}
								relative="path"
								unstable_viewTransition
								className="flex items-center gap-2"
							>
								<Icon name="double-arrow-left" />
								<span className="hidden sm:flex">Cancelar</span>
							</Link>
						</Button>
						<div className="flex  justify-end gap-4">
							<Button variant={'ghost'} type="reset">
								Restaurar
							</Button>
							<StatusButton
								form={form.id}
								className="sm:w-fit"
								type="submit"
								variant="default"
								status={isPending ? 'pending' : form.status ?? 'idle'}
								disabled={isPending}
							>
								<div className="flex items-center gap-1 ">
									<span>
										{isPending ? 'Actualizando...' : 'Actualizar Datos'}
									</span>
								</div>
							</StatusButton>
						</div>
					</div>
				</Form>
			</CardContent>
			<CardFooter className="flex  flex-row items-center justify-end border-t bg-muted/50 p-3 text-sm text-muted-foreground">
				<span className="flex items-center gap-2">
					<Icon size="sm" name="clock" /> Última modificación{' '}
					{formatRelative(subDays(product.updatedAt, 0), new Date(), {
						locale: es,
					})}
				</span>
			</CardFooter>
		</Card>
	)
}

function CardContentItem({
	icon,
	content,
	title,
}: {
	icon: IconName
	title: string
	content: string | number
}) {
	return (
		<div className="flex gap-4  p-2 ">
			<Icon name={icon} size="md" />
			<div>
				<div className="text-muted-foreground">{title}</div>
				<div>{content}</div>
			</div>
		</div>
	)
}
