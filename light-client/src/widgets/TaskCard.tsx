import { useState } from 'react';
import { MdCheck, MdExpandLess, MdHelpOutline, MdSchedule } from 'react-icons/md';

import { BigButton } from './BigButton';
import './TaskCard.css';

interface TaskCardProps {
  done: boolean;
  title: string;
  subtitle: string;
  /** Shown behind "Why am I doing this?" */
  whyText?: string;
  /** Undefined when done. */
  onComplete?: () => void;
}

/**
 * Figma TaskCard (node 12-23). Done shows mint with a check, waiting shows amber with a clock.
 * Subtitle text is 18 px so child screens stay at 18 px or larger.
 */
export function TaskCard({ done, title, subtitle, whyText, onComplete }: TaskCardProps) {
  const [showWhy, setShowWhy] = useState(false);
  const StatusIcon = done ? MdCheck : MdSchedule;
  const WhyIcon = showWhy ? MdExpandLess : MdHelpOutline;

  return (
    <div className="task-card">
      <div className="task-card__head">
        <div className={`task-card__status task-card__status--${done ? 'done' : 'waiting'}`}>
          <StatusIcon aria-label={done ? 'Done' : 'Waiting'} role="img" />
        </div>
        <div>
          <p className="text-button">{title}</p>
          <p className="text-body-muted">{subtitle}</p>
        </div>
      </div>

      {whyText && (
        <>
          <button
            type="button"
            className="task-card__why text-button"
            aria-expanded={showWhy}
            onClick={() => setShowWhy((v) => !v)}
          >
            <WhyIcon aria-hidden />
            <span>Why am I doing this?</span>
          </button>
          {showWhy && <p className="text-body task-card__why-text">{whyText}</p>}
        </>
      )}

      {!done && onComplete && (
        <div className="task-card__action">
          <BigButton label="I did it!" icon={MdCheck} onPress={onComplete} />
        </div>
      )}
    </div>
  );
}
