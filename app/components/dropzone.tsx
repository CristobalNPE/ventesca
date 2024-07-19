import React from 'react'
import { Icon } from './ui/icon'

export interface DropzoneProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	acceptLabel: string
}

const Dropzone = React.forwardRef<HTMLInputElement, DropzoneProps>(
	({ acceptLabel, ...props }, ref) => {
		return (
			<div className="flex w-full items-center justify-center">
				<label
					htmlFor="dropzone-file"
					className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground bg-card transition-colors hover:bg-secondary"
				>
					<div className="flex flex-col items-center justify-center pb-6 pt-5 ">
						<Icon name="upload" size="xl" className="mb-4" />
						<p className="mb-2 text-sm text-muted-foreground">
							<span className="font-semibold">Click para cargar</span> o
							arrastre y suelte el archivo
						</p>
						<p className="text-xs text-muted-foreground">{acceptLabel}</p>
					</div>
					<input
						id="dropzone-file"
						type="file"
						className="hidden"
						ref={ref}
						{...props}
					/>
				</label>
			</div>
		)
	},
)
Dropzone.displayName = 'Dropzone'

export { Dropzone }
