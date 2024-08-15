import { useState , useMemo } from 'react'

import { useHotkeys } from 'react-hotkeys-hook'
import { Key } from 'ts-key-enum'

export const useRoveFocus = (size: number) => {
	const [currentFocus, setCurrentFocus] = useState(0)

	useHotkeys(Key.ArrowDown, () =>
		setCurrentFocus(currentFocus === size - 1 ? 0 : currentFocus + 1),
	)
	useHotkeys(Key.ArrowUp, () =>
		setCurrentFocus(currentFocus === 0 ? size - 1 : currentFocus - 1),
	)

	return useMemo(() => [currentFocus, setCurrentFocus] as const, [currentFocus])
}
