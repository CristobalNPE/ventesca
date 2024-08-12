import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { isValidNumber } from '#app/utils/misc.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { Category, Supplier } from '@prisma/client'
import { LoaderFunctionArgs } from '@remix-run/node'
import XLSX from 'xlsx-js-style'

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const [businessCategories, businessSuppliers, business] = await Promise.all([
		prisma.category.findMany({
			where: { businessId },
			select: { id: true, code: true, description: true },
		}),
		prisma.supplier.findMany({
			where: { businessId },
			select: { id: true, code: true, fantasyName: true },
		}),
		prisma.business.findUniqueOrThrow({
			where: { id: businessId },
			select: { name: true },
		}),
	])

	const businessNameSlug = business.name.replace(' ', '-')
	const fileName = `Plantilla_inventario-${businessNameSlug}.xlsx`

	const buffer = createExcelTemplate(businessCategories, businessSuppliers)

	return new Response(buffer, {
		status: 200,
		headers: {
			'Content-Type':
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename=${fileName}`,
		},
	})
}

const headers = [
	'Código',
	'Nombre Producto',
	'Valor',
	'Precio Venta',
	'Stock Inicial',
	'Código Categoría',
	'Código Proveedor',
]

function createExcelTemplate(
	categories: Pick<Category, 'id' | 'code' | 'description'>[],
	suppliers: Pick<Supplier, 'id' | 'code' | 'fantasyName'>[],
) {
	const workbook = XLSX.utils.book_new()
	const worksheet = XLSX.utils.aoa_to_sheet([headers])

	// Add instructions
	XLSX.utils.sheet_add_aoa(
		worksheet,
		[
			['Instrucciones:'],
			['1. Complete la información del inventario en las columnas A-G.'],
			['2. Use los códigos de categoría y proveedor de las tablas de ayuda.'],
			[
				'3. Si no conoce alguna información, deje en blanco. Se aplicarán valores predeterminados.',
			],
			[
				'4. Evite modificar el resto del documento para evitar errores de validación.',
			],
		],
		{ origin: 'I1' },
	)

	// Add categories helper table
	XLSX.utils.sheet_add_aoa(
		worksheet,
		[
			['Categorías'],
			['Código', 'Descripción'],
			...categories.map(cat => [cat.code, cat.description]),
		],
		{ origin: 'I7' },
	)

	// Add suppliers helper table
	XLSX.utils.sheet_add_aoa(
		worksheet,
		[
			['Proveedores'],
			['Código', 'Nombre'],
			...suppliers.map(sup => [sup.code, sup.fantasyName]),
		],
		{ origin: `I${categories.length + 10}` },
	)

	// Set column widths
	worksheet['!cols'] = [
		{ wch: 18 },
		{ wch: 45 },
		{ wch: 12 },
		{ wch: 12 },
		{ wch: 12 },
		{ wch: 20 },
		{ wch: 20 },
		{ wch: 5 }, // Extra column for spacing
		{ wch: 14 },
		{ wch: 30 }, // Columns for helper tables
	]

	// Format 'Codigo' column as text and add data validation
	const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
	for (let R = range.s.r; R <= range.e.r; ++R) {
		const addr = XLSX.utils.encode_cell({ r: R, c: 0 }) // Column A
		if (!worksheet[addr]) worksheet[addr] = { t: 's', v: '' }
		worksheet[addr].t = 's'
		worksheet[addr].z = '@' // Custom number format for text
	}

	// Add data validation to force text input for 'Codigo' column
	worksheet['!dataValidation'] = [
		{
			sqref: 'A2:A1048576', // Apply to all rows in column A, starting from row 2
			type: 'custom',
			formula1: 'ISTEXT(A2)',
			allowBlank: true,
		},
	]

	// Styling
	const borderStyle = { style: 'thin', color: { rgb: '0d1526' } }
	const headerStyle = {
		fill: { fgColor: { rgb: 'c5d9f1' } },
		font: { bold: true },
		border: {
			top: borderStyle,
			bottom: borderStyle,
			left: borderStyle,
			right: borderStyle,
		},
	}
	const borderOnlyStyle = {
		border: {
			top: borderStyle,
			bottom: borderStyle,
			left: borderStyle,
			right: borderStyle,
		},
	}

	// Apply styles to main inventory header
	for (let col = 0; col < 7; col++) {
		const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
		worksheet[cellAddress].s = headerStyle
	}

	// Apply styles to categories table
	for (let row = 6; row < categories.length + 9; row++) {
		for (let col = 8; col < 10; col++) {
			const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
			if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: 's', v: '' }
			worksheet[cellAddress].s = row < 8 ? headerStyle : borderOnlyStyle
		}
	}

	// Apply styles to suppliers table
	for (
		let row = categories.length + 9;
		row < categories.length + suppliers.length + 12;
		row++
	) {
		for (let col = 8; col < 10; col++) {
			const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
			if (!worksheet[cellAddress]) worksheet[cellAddress] = { t: 's', v: '' }
			worksheet[cellAddress].s =
				row < categories.length + 11 ? headerStyle : borderOnlyStyle
		}
	}

	// Apply styles to instructions
	for (let row = 0; row < 5; row++) {
		for (let col = 8; col < 10; col++) {
			const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
			if (worksheet[cellAddress])
				worksheet[cellAddress].s = { font: { bold: true } }
		}
	}

	XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventario')

	// Generate buffer
	const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
	return buffer
}

export type ParsedProduct = {
	code: string
	name: string
	cost: string
	sellingPrice: string
	stock: string
	categoryCode: string
	supplierCode: string
}

export function parseExcelTemplate(buffer: Buffer): ParsedProduct[] {
	const workbook = XLSX.read(buffer, { type: 'buffer' })
	const worksheet = workbook.Sheets[workbook.SheetNames[0]!] // Assuming the data is in the first sheet

	const products: ParsedProduct[] = []
	let rowIndex = 1 // Start from the second row (index 1) to skip the header

	while (true) {
		const row = XLSX.utils.encode_row(rowIndex)
		const productCode = worksheet![`A${row}`]?.v

		// If we've reached an empty row, stop parsing
		if (!productCode) break

		products.push({
			code: String(productCode),
			name: String(worksheet![`B${row}`]?.v || ''),
			cost: String(worksheet![`C${row}`]?.v || 0),
			sellingPrice: String(worksheet![`D${row}`]?.v || 0),
			stock: String(worksheet![`E${row}`]?.v || 0),
			categoryCode: String(worksheet![`F${row}`]?.v || 0),
			supplierCode: String(worksheet![`G${row}`]?.v || 0),
		})

		rowIndex++
	}

	return products
}

export function validateTemplate(buffer: Buffer): boolean {
	const workbook = XLSX.read(buffer, { type: 'buffer' })
	const worksheet = workbook.Sheets[workbook.SheetNames[0]!]

	// Check the structure (headers)
	const expectedHeaders = headers
	for (let i = 0; i < expectedHeaders.length; i++) {
		const cell = worksheet![XLSX.utils.encode_cell({ r: 0, c: i })]
		if (cell?.v !== expectedHeaders[i]) {
			return false
		}
	}

	// Check for helper tables
	if (
		worksheet!['I7']?.v !== 'Categorías' ||
		worksheet!['I8']?.v !== 'Código'
	) {
		return false
	}

	// More checks...

	return true
}

export function validateParsedProduct({
	parsedProduct,
	businessCategories,
	fallbackCategory,
	businessSuppliers,
	fallbackSupplier,
}: {
	parsedProduct: ParsedProduct
	businessCategories: Array<{ id: string; code: number }>
	businessSuppliers: Array<{ id: string; code: number }>
	fallbackCategory: { id: string }
	fallbackSupplier: { id: string }
}) {
	const categoryCodes = businessCategories.map(cat => cat.code)
	const supplierCodes = businessSuppliers.map(supplier => supplier.code)

	const hasValidCategoryCode =
		isValidNumber(parsedProduct.categoryCode) &&
		categoryCodes.includes(Number(parsedProduct.categoryCode))
	const hasValidSupplierCode =
		isValidNumber(parsedProduct.supplierCode) &&
		supplierCodes.includes(Number(parsedProduct.supplierCode))
	const hasValidStock =
		isValidNumber(parsedProduct.stock) && Number(parsedProduct.stock) >= 0
	const hasValidCost =
		isValidNumber(parsedProduct.cost) && Number(parsedProduct.cost) >= 0
	const hasValidSellingPrice =
		isValidNumber(parsedProduct.sellingPrice) &&
		Number(parsedProduct.sellingPrice) >= 0

	const categoryId = hasValidCategoryCode
		? businessCategories.find(
				cat => cat.code === Number(parsedProduct.categoryCode),
			)!.id
		: fallbackCategory.id

	const supplierId = hasValidSupplierCode
		? businessSuppliers.find(
				sup => sup.code === Number(parsedProduct.supplierCode),
			)!.id
		: fallbackSupplier.id

	const isValidProductName = parsedProduct.name.trim().length > 0

	let errorMessage = ''

	if (!isValidProductName) {
		errorMessage = 'No se encontró un nombre válido para este producto.'
	} else if (
		!hasValidCategoryCode ||
		!hasValidSupplierCode ||
		!hasValidStock ||
		!hasValidCost ||
		!hasValidSellingPrice
	) {
		errorMessage =
			'Se aplicaron valores predeterminados a campos con datos inválidos.'
	}

	return {
		isValidProductName,
		categoryId,
		supplierId,
		stock: hasValidStock ? Number(parsedProduct.stock) : 0,
		cost: hasValidCost ? Number(parsedProduct.cost) : 0,
		sellingPrice: hasValidSellingPrice ? Number(parsedProduct.sellingPrice) : 0,
		errorMessage,
	}
}
