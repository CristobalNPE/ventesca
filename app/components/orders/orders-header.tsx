import { VerifyOrderDialog } from "#app/routes/_orders+/orders_.verify-order.tsx";

export function OrdersHeader() {
	return (
		<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
			<h1 className="text-xl font-semibold">Reportes de Transacción</h1>
      <VerifyOrderDialog />
		</div>
	)
}
