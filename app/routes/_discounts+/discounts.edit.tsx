import { requireUserId } from '#app/utils/auth.server.ts'
import { formatCurrency, invariantResponse } from '#app/utils/misc.tsx'
import { ActionFunctionArgs, json } from '@remix-run/node'
import {
	DiscountNameEditorSchema,
	UPDATE_DISCOUNT_NAME_KEY,
} from './__discounts-editors/name-editor.tsx'
import { parseWithZod } from '@conform-to/zod'
import { prisma } from '#app/utils/db.server.ts'
import {
	DiscountDescriptionEditorSchema,
	REGENERATE_DISCOUNT_DESCRIPTION_KEY,
	UPDATE_DISCOUNT_DESCRIPTION_KEY,
} from './__discounts-editors/description-editor.tsx'
import {
	DiscountMinquantityEditorSchema,
	UPDATE_DISCOUNT_MINQUANTITY_KEY,
} from './__discounts-editors/quantity-editor.tsx'
import { buildDescription } from './discounts_.new.tsx'
import { DiscountType } from './_types/discount-type.ts'
import { DiscountScope } from './_types/discount-reach.ts'
import { DiscountApplicationMethod } from './_types/discount-applicationMethod.ts'
import {
	DISCOUNT_FIXED_VALUE_MAX,
	DISCOUNT_FIXED_VALUE_MIN,
	DISCOUNT_PORCENTUAL_VALUE_MAX,
	DISCOUNT_PORCENTUAL_VALUE_MIN,
	DiscountValueEditorSchema,
	UPDATE_DISCOUNT_VALUE_KEY,
} from './__discounts-editors/value-editor.tsx'
import { z } from 'zod'
import {
	DiscountTypeEditorSchema,
	UPDATE_DISCOUNT_TYPE_KEY,
} from './__discounts-editors/type-editor.tsx'
import {
	DiscountAppmethodEditorSchema,
	UPDATE_DISCOUNT_APPMETHOD_KEY,
} from './__discounts-editors/applicationMethod-editor.tsx'

export async function action({ request }: ActionFunctionArgs) {
	//should require with admin permission later
	await requireUserId(request)

	const formData = await request.formData()

	const intent = formData.get('intent')

	invariantResponse(intent, 'Intent should be defined')

	switch (intent) {
		case UPDATE_DISCOUNT_NAME_KEY: {
			const submission = await parseWithZod(formData, {
				schema: DiscountNameEditorSchema,
			})
			if (submission.status !== 'success') {
				return json(
					{ result: submission.reply() },
					{ status: submission.status === 'error' ? 400 : 200 },
				)
			}

			const { discountId, name } = submission.value

			await prisma.discount.update({
				where: { id: discountId },
				data: { name },
			})

			return json({ result: submission.reply() })
		}
		case UPDATE_DISCOUNT_DESCRIPTION_KEY: {
			const submission = await parseWithZod(formData, {
				schema: DiscountDescriptionEditorSchema,
			})
			if (submission.status !== 'success') {
				return json(
					{ result: submission.reply() },
					{ status: submission.status === 'error' ? 400 : 200 },
				)
			}

			const { discountId, description } = submission.value

			await prisma.discount.update({
				where: { id: discountId },
				data: { description },
			})

			return json({ result: submission.reply() })
		}

		case REGENERATE_DISCOUNT_DESCRIPTION_KEY: {
			const submission = await parseWithZod(formData, {
				schema: DiscountDescriptionEditorSchema,
			})
			if (submission.status !== 'success') {
				return json(
					{ result: submission.reply() },
					{ status: submission.status === 'error' ? 400 : 200 },
				)
			}

			const { discountId } = submission.value

			const discount = await prisma.discount.findUniqueOrThrow({
				where: { id: discountId },
				select: {
					description: true,
					minimumQuantity: true,
					scope: true,
					applicationMethod: true,
					type: true,
					value: true,
				},
			})

			const generatedDescription = buildDescription(
				discount.type as DiscountType,
				discount.value,
				discount.scope as DiscountScope,
				discount.applicationMethod as DiscountApplicationMethod,
				discount.minimumQuantity,
			)

			if (generatedDescription !== discount.description) {
				await prisma.discount.update({
					where: { id: discountId },
					data: { description: generatedDescription },
				})
			}

			return json({ result: submission.reply() })
		}

		case UPDATE_DISCOUNT_MINQUANTITY_KEY: {
			const submission = await parseWithZod(formData, {
				schema: DiscountMinquantityEditorSchema,
			})
			if (submission.status !== 'success') {
				return json(
					{ result: submission.reply() },
					{ status: submission.status === 'error' ? 400 : 200 },
				)
			}

			const { discountId, minQuantity } = submission.value

			await prisma.discount.update({
				where: { id: discountId },
				data: { minimumQuantity: minQuantity },
			})

			return json({ result: submission.reply() })
		}
		case UPDATE_DISCOUNT_VALUE_KEY: {
			const submission = await parseWithZod(formData, {
				schema: DiscountValueEditorSchema.superRefine(async (data, ctx) => {
					const discount = await prisma.discount.findUniqueOrThrow({
						where: { id: data.discountId },
					})

					if (discount.type === DiscountType.PERCENTAGE && data.value > 100) {
						ctx.addIssue({
							path: ['value'],
							code: z.ZodIssueCode.custom,
							message: `Un descuento porcentual no puede ser mayor al ${DISCOUNT_PORCENTUAL_VALUE_MAX}%`,
						})
					}
					if (
						discount.type === DiscountType.FIXED &&
						data.value > DISCOUNT_FIXED_VALUE_MAX
					) {
						ctx.addIssue({
							path: ['value'],
							code: z.ZodIssueCode.custom,
							message: `Un descuento fijo no puede ser mayor a ${formatCurrency(
								DISCOUNT_FIXED_VALUE_MAX,
							)}%`,
						})
					}
					if (
						discount.type === DiscountType.PERCENTAGE &&
						data.value < DISCOUNT_PORCENTUAL_VALUE_MIN
					) {
						ctx.addIssue({
							path: ['value'],
							code: z.ZodIssueCode.custom,
							message: `Un descuento porcentual no puede ser menor al ${DISCOUNT_PORCENTUAL_VALUE_MIN}%`,
						})
					}
					if (
						discount.type === DiscountType.FIXED &&
						data.value < DISCOUNT_FIXED_VALUE_MIN
					) {
						ctx.addIssue({
							path: ['value'],
							code: z.ZodIssueCode.custom,
							message: `Un descuento fijo no puede ser menor a ${formatCurrency(
								DISCOUNT_FIXED_VALUE_MIN,
							)}%`,
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

			const { discountId, value } = submission.value

			await prisma.discount.update({
				where: { id: discountId },
				data: { value },
			})

			return json({ result: submission.reply() })
		}
		case UPDATE_DISCOUNT_TYPE_KEY: {
			const submission = await parseWithZod(formData, {
				schema: DiscountTypeEditorSchema,
			})
			if (submission.status !== 'success') {
				return json(
					{ result: submission.reply() },
					{ status: submission.status === 'error' ? 400 : 200 },
				)
			}

			const { discountId, type } = submission.value

			const currentDiscountState = await prisma.discount.findFirstOrThrow({
				where: { id: discountId },
				select: { type: true },
			})

			if (currentDiscountState.type !== type) {
				await prisma.discount.update({
					where: { id: discountId },
					data: { type, value: 0 },
				})
			}

			return json({ result: submission.reply() })
		}
		case UPDATE_DISCOUNT_APPMETHOD_KEY: {
			const submission = await parseWithZod(formData, {
				schema: DiscountAppmethodEditorSchema,
			})
			if (submission.status !== 'success') {
				return json(
					{ result: submission.reply() },
					{ status: submission.status === 'error' ? 400 : 200 },
				)
			}

			const { discountId, applicationMethod } = submission.value

			const currentDiscountState = await prisma.discount.findFirstOrThrow({
				where: { id: discountId },
				select: { applicationMethod: true },
			})

			if (currentDiscountState.applicationMethod !== applicationMethod) {
				await prisma.discount.update({
					where: { id: discountId },
					data: { applicationMethod },
				})
			}

			return json({ result: submission.reply() })
		}
	}
}
