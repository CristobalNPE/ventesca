import { Link, useSearchParams } from '@remix-run/react'
import { setSearchParamsString } from '#app/utils/misc.tsx'
import { Button } from './ui/button.tsx'
import { Icon } from './ui/icon.tsx'

export function PaginationBar({ total, top }: { total: number; top: number }) {
	const [searchParams] = useSearchParams()
	const $skip = Number(searchParams.get('$skip')) || 0
	const $top = Number(searchParams.get('$top')) || top
	const totalPages = Math.ceil(total / $top)
	const currentPage = Math.floor($skip / $top) + 1
	const maxPages = 5
	const halfMaxPages = Math.floor(maxPages / 2)
	const canPageBackwards = $skip > 0
	const canPageForwards = $skip + $top < total
	const pageNumbers = [] as Array<number>
	if (totalPages <= maxPages) {
		for (let i = 1; i <= totalPages; i++) {
			pageNumbers.push(i)
		}
	} else {
		let startPage = currentPage - halfMaxPages
		let endPage = currentPage + halfMaxPages
		if (startPage < 1) {
			endPage += Math.abs(startPage) + 1
			startPage = 1
		}
		if (endPage > totalPages) {
			startPage -= endPage - totalPages
			endPage = totalPages
		}
		for (let i = startPage; i <= endPage; i++) {
			pageNumbers.push(i)
		}
	}
	return (
		<div className="flex items-center gap-[1px] sm:gap-1">
			<Button size="sm" variant="outline" asChild disabled={!canPageBackwards}>
				<Link
					to={{
						search: setSearchParamsString(searchParams, {
							$skip: 0,
						}),
					}}
					preventScrollReset
					prefetch="intent"
					className="text-muted-foreground"
				>
					<span className="sr-only">First page</span>
					<Icon name="double-arrow-left" />
				</Link>
			</Button>
			<Button size="sm" variant="outline" asChild disabled={!canPageBackwards}>
				<Link
					to={{
						search: setSearchParamsString(searchParams, {
							$skip: Math.max($skip - $top, 0),
						}),
					}}
					preventScrollReset
					prefetch="intent"
					className="text-muted-foreground"
				>
					<span className="sr-only"> Previous page</span>
					<Icon name="arrow-left" />
				</Link>
			</Button>
			{pageNumbers.map(pageNumber => {
				const pageSkip = (pageNumber - 1) * $top
				const isCurrentPage = pageNumber === currentPage
				if (isCurrentPage) {
					return (
						<Button
							size="sm"
							variant="ghost"
							key={`${pageNumber}-active`}
							className="grid min-w-[2rem] place-items-center bg-primary text-sm text-primary-foreground"
						>
							<div>
								<span className="sr-only">Page {pageNumber}</span>
								<span>{pageNumber}</span>
							</div>
						</Button>
					)
				} else {
					return (
						<Button size="sm" variant="ghost" asChild key={pageNumber}>
							<Link
								to={{
									search: setSearchParamsString(searchParams, {
										$skip: pageSkip,
									}),
								}}
								preventScrollReset
								prefetch="intent"
								className="w-[1rem] font-normal text-muted-foreground md:min-w-[2rem]"
							>
								{pageNumber}
							</Link>
						</Button>
					)
				}
			})}
			<Button size="sm" variant="outline" asChild disabled={!canPageForwards}>
				<Link
					to={{
						search: setSearchParamsString(searchParams, {
							$skip: canPageForwards ? $skip + $top : 0,
						}),
					}}
					preventScrollReset
					prefetch="intent"
					className="text-muted-foreground"
				>
					<span className="sr-only"> Next page</span>
					<Icon name="arrow-right" />
				</Link>
			</Button>
			<Button size="sm" variant="outline" asChild disabled={!canPageForwards}>
				<Link
					to={{
						search: setSearchParamsString(searchParams, {
							$skip: (totalPages - 1) * $top,
						}),
					}}
					preventScrollReset
					prefetch="intent"
					className="text-muted-foreground"
				>
					<span className="sr-only"> Last page</span>
					<Icon name="double-arrow-right" />
				</Link>
			</Button>
		</div>
	)
}
// import { Link, useSearchParams } from '@remix-run/react'
// import { setSearchParamsString } from '#app/utils/misc.tsx'
// import { Button } from './ui/button.tsx'
// import { Icon } from './ui/icon.tsx'

// interface PaginationBarProps {
//   total: number;
//   itemsPerPage: number;
// }

// export function PaginationBar({ total, itemsPerPage }: PaginationBarProps) {
//   const [searchParams] = useSearchParams()
//   const currentPage = Number(searchParams.get('page')) || 1
//   const totalPages = Math.ceil(total / itemsPerPage)

//   const getPageRange = () => {
//     const delta = 2
//     const range = []
//     const rangeWithDots = []

//     for (let i = 1; i <= totalPages; i++) {
//       if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
//         range.push(i)
//       }
//     }

//     let l
//     for (const i of range) {
//       if (l) {
//         if (i - l === 2) {
//           rangeWithDots.push(l + 1)
//         } else if (i - l !== 1) {
//           rangeWithDots.push('...')
//         }
//       }
//       rangeWithDots.push(i)
//       l = i
//     }

//     return rangeWithDots
//   }

//   const pageRange = getPageRange()

//   const renderPageLink = (page: number | string) => {
//     const isCurrentPage = page === currentPage
//     const pageSkip = (Number(page) - 1) * itemsPerPage

//     if (page === '...') {
//       return <span key={`ellipsis-${page}`} className="px-2">...</span>
//     }

//     return (
//       <Button
//         key={`page-${page}`}
//         size="sm"
//         variant={isCurrentPage ? "default" : "ghost"}
//         asChild={!isCurrentPage}
//         className={isCurrentPage ? "pointer-events-none" : ""}
//       >
//         {isCurrentPage ? (
//           <span className="min-w-[2rem]">{page}</span>
//         ) : (
//           <Link
//             to={{ search: setSearchParamsString(searchParams, { page: String(page), $skip: String(pageSkip) }) }}
//             preventScrollReset
//             prefetch="intent"
//             className="min-w-[2rem]"
//           >
//             {page}
//           </Link>
//         )}
//       </Button>
//     )
//   }

//   return (
//     <nav aria-label="Pagination" className="flex items-center justify-center space-x-1">
//       <Button size="sm" variant="outline" asChild disabled={currentPage === 1}>
//         <Link
//           to={{ search: setSearchParamsString(searchParams, { page: '1', $skip: '0' }) }}
//           preventScrollReset
//           prefetch="intent"
//           aria-label="Go to first page"
//         >
//           <Icon name="double-arrow-left" />
//         </Link>
//       </Button>
//       <Button size="sm" variant="outline" asChild disabled={currentPage === 1}>
//         <Link
//           to={{ search: setSearchParamsString(searchParams, { page: String(currentPage - 1), $skip: String((currentPage - 2) * itemsPerPage) }) }}
//           preventScrollReset
//           prefetch="intent"
//           aria-label="Go to previous page"
//         >
//           <Icon name="arrow-left" />
//         </Link>
//       </Button>
      
//       {pageRange.map(page => renderPageLink(page))}
      
//       <Button size="sm" variant="outline" asChild disabled={currentPage === totalPages}>
//         <Link
//           to={{ search: setSearchParamsString(searchParams, { page: String(currentPage + 1), $skip: String(currentPage * itemsPerPage) }) }}
//           preventScrollReset
//           prefetch="intent"
//           aria-label="Go to next page"
//         >
//           <Icon name="arrow-right" />
//         </Link>
//       </Button>
//       <Button size="sm" variant="outline" asChild disabled={currentPage === totalPages}>
//         <Link
//           to={{ search: setSearchParamsString(searchParams, { page: String(totalPages), $skip: String((totalPages - 1) * itemsPerPage) }) }}
//           preventScrollReset
//           prefetch="intent"
//           aria-label="Go to last page"
//         >
//           <Icon name="double-arrow-right" />
//         </Link>
//       </Button>
//     </nav>
//   )
// }