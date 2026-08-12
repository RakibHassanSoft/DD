import { DateTime } from 'luxon';

type Schedule = { startAt: Date; timezone: string; days: number[]; windowStart: string; windowEnd: string; dailyLimit: number };
const clock = (value: string) => { const [hour, minute] = value.split(':').map(Number); return { hour, minute }; };
export function isWithinSendingWindow(schedule: Schedule, when = new Date()) {
  const local = DateTime.fromJSDate(when).setZone(schedule.timezone); if (!local.isValid) return false;
  const weekday = local.weekday % 7; const start = local.set(clock(schedule.windowStart)); const end = local.set(clock(schedule.windowEnd));
  return schedule.days.includes(weekday) && local >= start && local <= end;
}
export function controlledSchedule(schedule: Schedule, count: number, now = new Date()) {
  const startAt = DateTime.fromJSDate(schedule.startAt).setZone(schedule.timezone); const current = DateTime.fromJSDate(now).setZone(schedule.timezone); let day = startAt > current ? startAt.startOf('day') : current.startOf('day'); const times: Date[] = [];
  while (times.length < count && day.diff(current, 'days').days < 60) {
    const weekday = day.weekday % 7;
    if (schedule.days.includes(weekday)) {
      const windowStart = day.set(clock(schedule.windowStart)); const windowEnd = day.set(clock(schedule.windowEnd)); const floor = DateTime.max(windowStart, day.hasSame(startAt, 'day') ? startAt : windowStart, day.hasSame(current, 'day') ? current : windowStart);
      if (floor < windowEnd) {
        const remaining = count - times.length; const todayCount = Math.min(schedule.dailyLimit, remaining); const span = windowEnd.diff(floor, 'milliseconds').milliseconds;
        for (let index = 0; index < todayCount; index++) times.push(floor.plus({ milliseconds: Math.floor(span * ((index + 1) / (todayCount + 1))) }).toUTC().toJSDate());
      }
    }
    day = day.plus({ days: 1 }).startOf('day');
  }
  return times;
}
