import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { type BusinessLogoImage } from '@prisma/client'
import {
	json,
	redirect,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	type SerializeFrom,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node'
import {
	Form,
	Link,
	type MetaFunction,
	useActionData,
	useLoaderData,
	useNavigation,
} from '@remix-run/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useState } from 'react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import VentescaLogoDark from '#app/routes/_marketing+/logos/ventesca-dark.png'
import VentescaLogoLight from '#app/routes/_marketing+/logos/ventesca-light.png'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import {
	cn,
	formatCurrency,
	getBusinessImgSrc,
	useDoubleCheck,
	useIsPending,
} from '#app/utils/misc.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { OrderStatus } from '../../types/orders/order-status'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { ContentLayout } from '#app/components/layout/content-layout.tsx'
import { MetricCard } from '#app/components/metric-card.js'

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)
	const formData = await unstable_parseMultipartFormData(
		request,
		unstable_createMemoryUploadHandler({ maxPartSize: MAX_SIZE }),
	)

	const submission = await parseWithZod(formData, {
		schema: BusinessLogoFormSchema.transform(async (data) => {
			if (data.intent === 'delete') return { intent: 'delete' }
			if (data.photoFile.size <= 0) return z.NEVER
			return {
				intent: data.intent,
				image: {
					contentType: data.photoFile.type,
					blob: Buffer.from(await data.photoFile.arrayBuffer()),
				},
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

	const { image, intent } = submission.value

	if (intent === 'delete') {
		await prisma.businessLogoImage.deleteMany({ where: { businessId } })
		return redirect('/business')
	}

	await prisma.$transaction(async ($prisma) => {
		await $prisma.businessLogoImage.deleteMany({ where: { businessId } })
		await $prisma.business.update({
			where: { id: businessId },
			data: { image: { create: image } },
		})
	})

	return redirect('/business')
}

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const business = await prisma.business.findUniqueOrThrow({
		include: { image: true },
		where: { id: businessId },
	})

	const [productsCount, suppliersCount, categoriesCount, sellersCount] =
		await Promise.all([
			prisma.product.count({ where: { businessId } }),
			prisma.supplier.count({ where: { businessId } }),
			prisma.category.count({ where: { businessId } }),
			prisma.user.count({
				where: { businessId, roles: { some: { name: 'Vendedor' } } },
			}),
		])

	return json({
		productsCount,
		suppliersCount,
		categoriesCount,
		sellersCount,
		business,
	})
}

export default function ProfileRoute() {
	const {
		business,
		productsCount,
		suppliersCount,
		categoriesCount,
		sellersCount,
	} = useLoaderData<typeof loader>()

	return (
		<ContentLayout title="Detalles de la Empresa" limitHeight>
			<Spacer size="xl" />
			<main className="grid gap-8 lg:grid-cols-2">
				<div className="container flex flex-col items-center  rounded-3xl border bg-card p-12 shadow-sm ">
					<div className="relative w-52 ">
						<div className="absolute -top-40">
							<div className="relative ">
								<img
									src={
										business.image
											? getBusinessImgSrc(business.image.id)
											: VentescaLogoDark
									}
									alt={business.name}
									className="hidden h-52 w-52 rounded-full border-8 border-card bg-primary object-cover shadow-sm dark:flex "
								/>
								<img
									src={
										business.image
											? getBusinessImgSrc(business.image.id)
											: VentescaLogoLight
									}
									alt={business.name}
									className="flex h-52 w-52 rounded-full border-8 border-card bg-primary object-cover shadow-sm dark:hidden"
								/>
								<ChangeBusinessLogoDialog logo={business.image} />
							</div>
						</div>
					</div>
					<Spacer size="sm" />
					<div className="flex flex-col items-center ">
						<div className="flex flex-wrap items-center justify-center gap-4">
							<h1 className="text-center text-h2">{business.name}</h1>
						</div>
						<p className="mt-2 text-center text-muted-foreground">
							Activa desde{'  '}
							{format(business.createdAt, "d'/'MM'/'yyyy", {
								locale: es,
							})}
						</p>
						<Spacer size="3xs" />
						<div className="flex flex-col gap-4 text-center text-lg font-thin">
							{business.address ? (
								<Icon size="lg" name="map-pin-filled">
									<span className="ml-2">{business.address}</span>
								</Icon>
							) : null}
							{business.email ? (
								<Icon size="lg" name="envelope-closed">
									<span className="ml-2">{business.email}</span>
								</Icon>
							) : null}
							{business.phone ? (
								<Icon size="lg" name="phone">
									<span className="ml-2">{business.phone}</span>
								</Icon>
							) : null}
						</div>
						<Spacer size="3xs" />
						<Button variant={'default'} size={'pill'} asChild>
							<Link to="edit">
								Modificar datos de la empresa{' '}
								<Icon name="pencil-1" className="ml-2" />
							</Link>
						</Button>
					</div>
				</div>
				<section className="flex flex-col gap-4">
					<div>
						<MetricCard
							className="rounded-b-none"
							title="Categorías registradas"
							value={categoriesCount}
							icon="shapes"
						/>
						<Button
							variant={'secondary'}
							className="w-full rounded-t-none"
							size={'pill'}
							asChild
						>
							<Link to="/categories" prefetch="intent" unstable_viewTransition>
								<Icon size="md" name="circle-plus">
									Administrar categorías
								</Icon>
							</Link>
						</Button>
					</div>
					<div>
						<MetricCard
							className="rounded-b-none"
							title="Proveedores registrados"
							value={suppliersCount}
							icon="users"
						/>
						<Button
							variant={'secondary'}
							className="w-full rounded-t-none"
							size={'pill'}
							asChild
						>
							<Link to="/suppliers" prefetch="intent" unstable_viewTransition>
								<Icon size="md" name="circle-plus">
									Administrar proveedores
								</Icon>
							</Link>
						</Button>
					</div>
					<div>
						<MetricCard
							className="rounded-b-none"
							title="Productos registrados"
							value={productsCount}
							icon="package"
						/>
						<Button
							variant={'secondary'}
							className={cn(
								'w-full rounded-t-none',
								productsCount === 0 &&
									'animate-pulse bg-primary text-primary-foreground hover:bg-primary',
							)}
							size={'pill'}
							asChild
						>
							<Link to="/inventory" prefetch="intent" unstable_viewTransition>
								<Icon size="md" name="circle-plus">
									Administrar inventario
								</Icon>
							</Link>
						</Button>
					</div>
					<div>
						<MetricCard
							className="rounded-b-none"
							title="Vendedores registrados"
							value={sellersCount}
							icon="user-dollar"
						/>
						<Button
							variant={'secondary'}
							className={cn(
								'w-full rounded-t-none',
								sellersCount === 0 &&
									'animate-pulse bg-primary text-primary-foreground hover:bg-primary',
							)}
							size={'pill'}
							asChild
						>
							<Link to="/sellers" prefetch="intent" unstable_viewTransition>
								<Icon size="md" name="circle-plus">
									Administrar vendedores
								</Icon>
							</Link>
						</Button>
					</div>
				</section>
			</main>
		</ContentLayout>
	)
}
const MAX_SIZE = 1024 * 1024 * 3 // 3MB

const DeleteBusinessLogoSchema = z.object({
	intent: z.literal('delete'),
})

const NewBusinessLogoSchema = z.object({
	intent: z.literal('submit'),
	photoFile: z
		.instanceof(File)
		.refine((file) => file.size > 0, 'Se requiere una imagen')
		.refine(
			(file) => file.size <= MAX_SIZE,
			'El tamaño de la imagen no puede ser mayor a 3MB',
		),
})

const BusinessLogoFormSchema = z.discriminatedUnion('intent', [
	DeleteBusinessLogoSchema,
	NewBusinessLogoSchema,
])

function ChangeBusinessLogoDialog({
	logo,
}: {
	logo: SerializeFrom<BusinessLogoImage> | null
}) {
	const doubleCheckDeleteImage = useDoubleCheck()

	const actionData = useActionData<typeof action>()
	const navigation = useNavigation()

	const [form, fields] = useForm({
		id: 'business-photo',
		constraint: getZodConstraint(BusinessLogoFormSchema),
		lastResult: actionData?.result,
		onSubmit: () => setNewImageSrc(null),
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: BusinessLogoFormSchema })
		},
		shouldRevalidate: 'onBlur',
	})

	const isPending = useIsPending()
	const pendingIntent = isPending ? navigation.formData?.get('intent') : null
	const lastSubmissionIntent = fields.intent.value

	const [newImageSrc, setNewImageSrc] = useState<string | null>(null)
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					className="absolute -right-2 bottom-3 z-30 flex h-10 w-10 items-center justify-center rounded-full p-0"
				>
					<Icon name="camera" className="h-4 w-4" />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Cambiar logo</DialogTitle>
					<DialogDescription asChild>
						<Form
							method="POST"
							encType="multipart/form-data"
							className="flex flex-col items-center justify-center gap-10"
							onReset={() => setNewImageSrc(null)}
							{...getFormProps(form)}
						>
							<img
								src={
									newImageSrc ??
									(logo ? getBusinessImgSrc(logo.id) : VentescaLogoDark)
								}
								className="h-52 w-52 rounded-full bg-primary object-cover"
								alt={'Logo de la empresa'}
							/>

							<ErrorList
								errors={fields.photoFile.errors}
								id={fields.photoFile.id}
							/>
							<div className="flex gap-4">
								{/*
						We're doing some kinda odd things to make it so this works well
						without JavaScript. Basically, we're using CSS to ensure the right
						buttons show up based on the input's "valid" state (whether or not
						an image has been selected). Progressive enhancement FTW!
					*/}
								<input
									{...getInputProps(fields.photoFile, { type: 'file' })}
									accept="image/*"
									className="peer sr-only"
									required
									tabIndex={newImageSrc ? -1 : 0}
									onChange={(e) => {
										const file = e.currentTarget.files?.[0]
										if (file) {
											const reader = new FileReader()
											reader.onload = (event) => {
												setNewImageSrc(event.target?.result?.toString() ?? null)
											}
											reader.readAsDataURL(file)
										}
									}}
								/>
								<Button
									asChild
									className="cursor-pointer peer-valid:hidden peer-focus-within:ring-2 peer-focus-visible:ring-2"
								>
									<label htmlFor={fields.photoFile.id}>
										<Icon name="pencil-1">Cambiar</Icon>
									</label>
								</Button>
								<StatusButton
									name="intent"
									value="submit"
									type="submit"
									className="peer-invalid:hidden"
									status={
										pendingIntent === 'submit'
											? 'pending'
											: lastSubmissionIntent === 'submit'
												? (form.status ?? 'idle')
												: 'idle'
									}
								>
									Guardar Logo
								</StatusButton>
								<Button
									variant="destructive"
									className="peer-invalid:hidden"
									{...form.reset.getButtonProps()}
								>
									<Icon name="trash">Reiniciar</Icon>
								</Button>
								{logo?.id ? (
									<StatusButton
										className="peer-valid:hidden"
										variant="destructive"
										{...doubleCheckDeleteImage.getButtonProps({
											type: 'submit',
											name: 'intent',
											value: 'delete',
										})}
										status={
											pendingIntent === 'delete'
												? 'pending'
												: lastSubmissionIntent === 'delete'
													? (form.status ?? 'idle')
													: 'idle'
										}
									>
										<Icon name="trash">
											{doubleCheckDeleteImage.doubleCheck
												? 'Confirmar eliminación'
												: 'Eliminar'}
										</Icon>
									</StatusButton>
								) : null}
							</div>
							<ErrorList errors={form.errors} />
						</Form>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	)
}

export const meta: MetaFunction<typeof loader> = ({ data, params }) => {
	const displayName = data?.business.name
	return [
		{ title: `${displayName} | Ventesca` },
		{
			name: 'description',
			content: `Datos de ${displayName} en Ventesca`,
		},
	]
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>Sin autorización.</p>,
			}}
		/>
	)
}
