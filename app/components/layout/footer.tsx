export function Footer() {
	return (
		<div className="z-20 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="mx-4 flex h-14 items-center md:mx-8">
				<p className="text-left text-xs leading-loose text-muted-foreground md:text-sm">
					Built on top of{' '}
					<a
						href="https://ui.shadcn.com"
						target="_blank"
						rel="noopener noreferrer"
						className="font-medium underline underline-offset-4"
					>
						shadcn/ui
					</a>
					. The source code is available on{' '}
					<a
						href="https://github.com/salimi-my/shadcn-ui-sidebar"
						target="_blank"
						rel="noopener noreferrer"
						className="font-medium underline underline-offset-4"
					>
						GitHub
					</a>
					.
				</p>
			</div>
		</div>
	)
}
