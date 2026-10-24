/**
 * The server renders in UTC and a reader's browser in their own zone, so a
 * date near midnight formatted with the local zone came out as one day on the
 * server and another in the browser. Fixing the zone makes both agree, and the
 * team works in Jakarta time anyway.
 */
const DISPLAY_TIME_ZONE = "Asia/Jakarta";

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  });
}
