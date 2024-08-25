import { resetFetcher } from '#app/utils/resetFetcher.ts'
import { FetcherWithComponents } from '@remix-run/react'
import { useEffect } from 'react'
import { toast } from 'sonner'

export function useSuccessToast({
	fetcher,
	message,
}: {
	fetcher: FetcherWithComponents<any>
	message: string
}) {
	useEffect(() => {
		if (fetcher.data?.result.status === 'success' && fetcher.state === 'idle') {
			toast.success(message)
			resetFetcher(fetcher);
		}
	}, [fetcher.data, fetcher.state, message])
}
