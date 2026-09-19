export function timeAgo(ts: string | number, now = Date.now()): string {
  const min = Math.round(Math.max(0, now - new Date(ts).getTime()) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export function clock(ts: string | number): string {
  const d = new Date(ts);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function dayLabel(ts: string | number): string {
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function shortDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.toLocaleDateString(undefined, { weekday: 'narrow' })}${d.getDate()}`;
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
