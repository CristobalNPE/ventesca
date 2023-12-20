import { Input } from '#app/components/ui/input.tsx'
import { formatChileanRUT } from '#app/utils/misc.tsx'
import { useState } from 'react'

export default function SellRoute() {
	const [rut, setRut] = useState('')

	const handleInputChange = event => {
		const rawRut = event.target.value
		const formattedRut = formatChileanRUT(rawRut)
		setRut(formattedRut)
	}
	return (
		<>
			<h1 className="text-2xl">Venta de artículos</h1>
			{/* test the chilean rut library */}
			<Input
				type="text"
				value={rut}
				onChange={handleInputChange}
				placeholder="Enter RUT"
			/>
		</>
	)
}
