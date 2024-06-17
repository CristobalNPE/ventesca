import { type LoaderFunctionArgs } from '@remix-run/node'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { action } from './__seller-editor.server.tsx'
import { SellerEditor } from './__seller-editor.tsx'

export { action }
export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserWithRole(request, 'Administrador')

	return null
}

export default function CreateSeller() {
	return <SellerEditor />
}
