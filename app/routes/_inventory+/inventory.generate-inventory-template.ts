export const loader = async () => {
	const csvContent =
		'Código,Nombre producto,Valor,Precio Venta,Stock Inicial,\n,,'
	const filename = 'user_template.csv'

	return new Response(csvContent, {
		status: 200,
		headers: {
			'Content-Type': 'text/csv',
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	})
}
