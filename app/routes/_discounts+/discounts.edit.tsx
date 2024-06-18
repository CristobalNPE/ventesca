import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency } from '#app/utils/misc.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { type ActionFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'
import {
	DiscountAppmethodEditorSchema,
	updateDiscountAppMethodActionIntent,
} from './__discounts-editors/applicationMethod-editor.tsx'
import {
	DiscountDescriptionEditorSchema,
	regenerateDiscountDescriptionActionIntent,
	updateDiscountDescriptionActionIntent,
} from './__discounts-editors/description-editor.tsx'
import {
	DiscountNameEditorSchema,
	updateDiscountNameActionIntent,
} from './__discounts-editors/name-editor.tsx'
import {
	DiscountMinquantityEditorSchema,
	updateDiscountMinQuantityActionIntent,
} from './__discounts-editors/quantity-editor.tsx'
import {
	DiscountTypeEditorSchema,
	updateDiscountTypeActionIntent,
} from './__discounts-editors/type-editor.tsx'
import {
	DiscountValidperiodEditorSchema,
	updateDiscountValidPeriodActionIntent,
} from './__discounts-editors/validPeriod-editor.tsx'
import {
	DISCOUNT_FIXED_VALUE_MAX,
	DISCOUNT_FIXED_VALUE_MIN,
	DISCOUNT_PORCENTUAL_VALUE_MAX,
	DISCOUNT_PORCENTUAL_VALUE_MIN,
	DiscountValueEditorSchema,
	updateDiscountValueActionIntent,
} from './__discounts-editors/value-editor.tsx'
import { type DiscountApplicationMethod } from './_types/discount-applicationMethod.ts'
import { type DiscountScope } from './_types/discount-reach.ts'
import { DiscountType } from './_types/discount-type.ts'
import { buildDescription } from './discounts_.new.tsx'

export async function action({ request }: ActionFunctionArgs) {
	await requireUserWithRole(request, 'Administrador')

	const formData = await request.formData()
	const intent = formData.get('intent')

	invariantResponse(intent, 'Intent should be defined')

	switch (intent) {
		case updateDiscountNameActionIntent: {
			return await updateDiscountNameAction({ formData })
		}
		case updateDiscountDescriptionActionIntent: {
			return await updateDiscountDescriptionAction({ formData })
		}
		case regenerateDiscountDescriptionActionIntent: {
			return await regenerateDiscountDescriptionAction({ formData })
		}
		case updateDiscountMinQuantityActionIntent: {
			return await updateDiscountMinQuantityAction({ formData })
		}
		case updateDiscountValueActionIntent: {
			return await updateDiscountValueAction({ formData })
		}
		case updateDiscountTypeActionIntent: {
			return await updateDiscountTypeAction({ formData })
		}
		case updateDiscountAppMethodActionIntent: {
			return await updateDiscountAppMethodAction({ formData })
		}
		case updateDiscountValidPeriodActionIntent: {
			return await updateDiscountValidPeriodAction({ formData })
		}
	}
}

async function updateDiscountNameAction({ formData }: { formData: FormData }) {
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

async function updateDiscountDescriptionAction({
	formData,
}: {
	formData: FormData
}) {
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

async function regenerateDiscountDescriptionAction({
	formData,
}: {
	formData: FormData
}) {
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

async function updateDiscountMinQuantityAction({
	formData,
}: {
	formData: FormData
}) {
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

async function updateDiscountValueAction({ formData }: { formData: FormData }) {
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
async function updateDiscountTypeAction({ formData }: { formData: FormData }) {
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

async function updateDiscountAppMethodAction({
	formData,
}: {
	formData: FormData
}) {
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
async function updateDiscountValidPeriodAction({
	formData,
}: {
	formData: FormData
}) {
	const submission = await parseWithZod(formData, {
		schema: DiscountValidperiodEditorSchema.superRefine(async (data, ctx) => {
			const discount = await prisma.discount.findUniqueOrThrow({
				where: { id: data.discountId },
				select: { validFrom: true },
			})

			if (data.validUntil.getTime() < discount.validFrom.getTime()) {
				ctx.addIssue({
					path: ['validFrom'],
					code: z.ZodIssueCode.custom,
					message: `La nueva fecha de termino no puede ser anterior a la fecha de inicio.`,
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

	const { discountId, validFrom, validUntil } = submission.value

	const currentDiscountState = await prisma.discount.findFirstOrThrow({
		where: { id: discountId },
		select: { validFrom: true, validUntil: true },
	})

	if (
		currentDiscountState.validFrom !== validFrom ||
		currentDiscountState.validUntil !== validUntil
	) {
		await prisma.discount.update({
			where: { id: discountId },
			data: { validFrom, validUntil },
		})
	}

	return json({ result: submission.reply() })
}
