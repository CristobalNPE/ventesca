import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'

import { SortDirection } from '#app/types/SortDirection.ts'
import { useState } from 'react'

interface SortDirectionButtonProps {
  sortDirection: SortDirection;
  onChange: (newDirection: SortDirection) => void;
}

export function SortDirectionButton({ sortDirection, onChange }: SortDirectionButtonProps) {
  const toggleSortDirection = () => {
    const newDirection = sortDirection === SortDirection.DESC ? SortDirection.ASC : SortDirection.DESC;
    onChange(newDirection);
  };

  return (
    <Button
      onClick={toggleSortDirection}
      variant={'outline'}
      size={'icon'}
    >
      <Icon size="sm" name={sortDirection === SortDirection.DESC ? "double-arrow-down" : "double-arrow-up"} />
      <span className="sr-only">Cambiar dirección de orden</span>
    </Button>
  );
}