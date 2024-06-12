import { type LoaderFunctionArgs } from '@remix-run/node'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import {action} from './__supplier-editor.server.tsx'
import { SupplierEditor } from './__supplier-editor.tsx'

export { action }
export async function loader({request}:LoaderFunctionArgs){
	await requireUserWithRole(request, "Administrador")

	return null;
}

export default function CreateSupplier() {
	return <SupplierEditor />
}
