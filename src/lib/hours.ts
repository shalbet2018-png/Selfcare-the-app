// Opening hours, stored as one [open, close] pair per open day in Nairobi time.
// Same shape and rules as providers.open_hours in supabase/schema.sql.

export const DAYS = [
  ['mon', 'Mon', 'Monday'], ['tue', 'Tue', 'Tuesday'], ['wed', 'Wed', 'Wednesday'], ['thu', 'Thu', 'Thursday'],
  ['fri', 'Fri', 'Friday'], ['sat', 'Sat', 'Saturday'], ['sun', 'Sun', 'Sunday'],
] as const;
export type DayKey = (typeof DAYS)[number][0];
/** A day left out is closed. An empty object means the business has not set its hours yet. */
export type OpenHours = Partial<Record<DayKey, [string, string]>>;

export const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

/** Day key for a calendar day id like "2026-11-24", read on this device's clock. */
export function dayKeyOf(dayId: string): DayKey {
  const [y, m, d] = dayId.split('-').map(Number);
  const js = new Date(y, m - 1, d).getDay(); // 0 = Sunday
  return DAYS[(js + 6) % 7][0];
}

export const hoursSet = (h?: OpenHours | null) => !!h && Object.keys(h).length > 0;

const toMins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** True when a service of `mins` minutes starting at `time` on `dayId` fits inside the hours. Unset hours allow anything. */
export function fitsHours(h: OpenHours | undefined | null, dayId: string, time: string, mins: number) {
  if (!hoursSet(h)) return true;
  const open = h![dayKeyOf(dayId)];
  if (!open) return false;
  const start = toMins(time);
  return start >= toMins(open[0]) && start + mins <= toMins(open[1]);
}

/** True when the business is closed all day. */
export function closedOn(h: OpenHours | undefined | null, dayId: string) {
  return hoursSet(h) && !h![dayKeyOf(dayId)];
}

const short = (t: string) => t.replace(/^0/, '');

/** "Mon–Fri 9:00–18:00 · Sat 10:00–16:00 · Sun closed", grouping neighbouring days with the same times. */
export function hoursSummary(h: OpenHours | undefined | null): string {
  if (!hoursSet(h)) return '';
  const parts: string[] = [];
  let i = 0;
  while (i < DAYS.length) {
    const key = DAYS[i][0];
    const v = h![key];
    let j = i;
    while (j + 1 < DAYS.length && JSON.stringify(h![DAYS[j + 1][0]]) === JSON.stringify(v)) j++;
    const label = i === j ? DAYS[i][1] : `${DAYS[i][1]}–${DAYS[j][1]}`;
    parts.push(v ? `${label} ${short(v[0])}–${short(v[1])}` : `${label} closed`);
    i = j + 1;
  }
  return parts.join(' · ');
}
