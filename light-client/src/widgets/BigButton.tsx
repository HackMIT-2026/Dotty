import type { IconType } from 'react-icons';

import './BigButton.css';

export type BigButtonTone = 'primary' | 'soft';

interface BigButtonProps {
  label: string;
  onPress?: () => void;
  tone?: BigButtonTone;
  icon?: IconType;
}

/** Figma BigButton (node 12-6). Main child button, 64 px tall, dark ink text. */
export function BigButton({ label, onPress, tone = 'primary', icon: Icon }: BigButtonProps) {
  return (
    <button type="button" className={`big-button big-button--${tone} text-button`} onClick={onPress}>
      {Icon && <Icon className="big-button__icon" aria-hidden />}
      <span>{label}</span>
    </button>
  );
}
