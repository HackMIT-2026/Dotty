import { MdFavorite } from 'react-icons/md';

import './ActivityItem.css';

interface ActivityItemProps {
  message: string;
  time: string;
}

/** Figma ActivityItem (node 12-24). One line in the parent feed. */
export function ActivityItem({ message, time }: ActivityItemProps) {
  return (
    <div className="activity-item">
      <div className="activity-item__badge">
        <MdFavorite aria-hidden />
      </div>
      <div>
        <p className="text-body">{message}</p>
        <p className="text-caption-muted">{time}</p>
      </div>
    </div>
  );
}
