import { MdBolt } from 'react-icons/md';

import './EnergyMeter.css';

/** Pip's energy, 0 to 100. Shown as a bar plus the number, so it never relies on color alone. */
export function EnergyMeter({ energy }: { energy: number }) {
  const percent = Math.min(100, Math.max(0, energy));
  return (
    <div role="img" aria-label={`Energy ${energy} out of 100`}>
      <div className="energy-meter__row">
        <MdBolt className="energy-meter__icon" aria-hidden />
        <span className="text-button">Energy</span>
        <span className="text-body energy-meter__value">{energy} / 100</span>
      </div>
      <div className="energy-meter__track">
        <div className="energy-meter__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
