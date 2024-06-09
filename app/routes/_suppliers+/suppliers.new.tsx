import { SupplierEditor } from './__supplier-editor.tsx'
import {action} from './__supplier-editor.server.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { LoaderFunctionArgs } from '@remix-run/node'

export { action }
export async function loader({request}:LoaderFunctionArgs){
	await requireUserWithRole(request, "Administrador")

	return null;
}

export default function CreateSupplier() {
	return <SupplierEditor />
}
