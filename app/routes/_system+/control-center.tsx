import { ReactBarcode } from 'react-jsbarcode'
import JsBarcode from 'jsbarcode'
import { useEffect, useState } from 'react'

export default function Page() {

	const [barcode,setBarcode] = useState("")
	useEffect(() => {
		let canvas
		canvas = document.createElement(`canvas`)
		JsBarcode(canvas, 'mycutedata')
		setBarcode(canvas.toDataURL())
	}, [])
	return (
		<div>
			Hello
			{/* <ReactBarcode value="6666s" /> */}
			<img src={barcode} />
		</div>
	)
}
