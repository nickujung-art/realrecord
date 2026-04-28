// UTC 자정 기준 Date 생성 (contractDate 저장용)
export function toContractDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

// 오늘 날짜인지 (UTC 기준)
export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}

// N일 이내인지 (현재 기준)
export function withinDays(date: Date, days: number): boolean {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  return date >= threshold;
}

// 오늘 UTC 자정 ~ 다음날 자정 범위 반환 (DB 쿼리용)
export function getTodayRange(): { gte: Date; lt: Date } {
  const now = new Date();
  const gte = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const lt = new Date(gte);
  lt.setUTCDate(lt.getUTCDate() + 1);
  return { gte, lt };
}

// 특정 Date 기준 UTC 자정 ~ 다음날 자정 범위 반환
export function getDateRange(date: Date): { gte: Date; lt: Date } {
  const gte = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const lt = new Date(gte);
  lt.setUTCDate(lt.getUTCDate() + 1);
  return { gte, lt };
}

// N일 전 UTC 자정 반환 (취소 이력 쿼리용)
export function getDaysAgoDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// "YYYY-MM-DD" 포맷
export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}
