import type { IconType } from 'react-icons';

import './DottyChip.css';

interface DottyChipProps {
  label: string;
  icon?: IconType;
}

/** Figma Chip (node 12-7). */
export function DottyChip({ label, icon: Icon }: DottyChipProps) {
  return (
    <span className="dotty-chip text-clinician-medium">
      {Icon && <Icon className="dotty-chip__icon" aria-hidden />}
      <span>{label}</span>
    </span>
  );
}
