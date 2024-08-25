import { FetcherWithComponents } from "@remix-run/react"

export const resetFetcher = (fetcher: FetcherWithComponents<any>) => {
	fetcher.submit({}, { method: 'POST', action: '/resources/reset-fetcher' })
}