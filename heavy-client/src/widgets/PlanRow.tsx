import { MdDeleteOutline } from 'react-icons/md';

import './PlanRow.css';

interface PlanRowProps {
  task: string;
  window: string;
  childWording: string;
  whyText: string;
  reward: number;
  onRemove?: () => void;
}

/** Figma PlanRow (node 13-2). One task in the plan, with the child's wording. */
export function PlanRow({ task, window, childWording, whyText, reward, onRemove }: PlanRowProps) {
  return (
    <div className="plan-row plan-grid">
      <p className="text-clinician-medium">{task}</p>
      <p className="text-clinician">{window}</p>
      <div>
        <p className="text-clinician-medium">{childWording}</p>
        <p className="text-clinician-muted">{whyText}</p>
      </div>
      <p className="text-clinician">{reward}</p>
      <button type="button" className="plan-row__remove" aria-label="Remove from plan" title="Remove from plan" onClick={onRemove}>
        <MdDeleteOutline aria-hidden />
      </button>
    </div>
  );
}
