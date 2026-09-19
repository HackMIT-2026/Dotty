import type { IconType } from 'react-icons';

import './BigButton.css';

export type BigButtonTone = 'primary' | 'soft';

interface BigButtonProps {
  label: string;
  onPress?: () => void;
  tone?: BigButtonTone;
  icon?: IconType;
  /** Submits the surrounding form instead of calling onPress. */
  submit?: boolean;
}

/** Figma BigButton (node 12-6), clinician size: 48 px tall, 16 px text, dark ink. */
export function BigButton({ label, onPress, tone = 'primary', icon: Icon, submit = false }: BigButtonProps) {
  return (
    <button type={submit ? 'submit' : 'button'} className={`big-button big-button--${tone} text-clinician-medium`} onClick={onPress}>
      {Icon && <Icon className="big-button__icon" aria-hidden />}
      <span>{label}</span>
    </button>
  );
}
