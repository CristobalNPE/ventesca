import { Fetcher } from '@remix-run/react'
import { useEffect } from 'react'
import { toast } from 'sonner'

export function useSuccessToast({
	fetcher,
	message,
}: {
	fetcher: Fetcher
	message: string
}) {
	useEffect(() => {
		if (fetcher.data?.result.status === 'success' && fetcher.state === 'idle') {
			toast.success(message)
		}
	}, [fetcher.data, fetcher.state, message])
}
