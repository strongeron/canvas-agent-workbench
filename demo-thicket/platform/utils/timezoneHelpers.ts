export function areInSameTimezone(courseTimezone?: string, userTimezone?: string) {
  if (!courseTimezone || !userTimezone) return true
  return courseTimezone === userTimezone
}

export function formatWithTimezoneAbbr(
  dateString: string,
  timeZone: string,
  formatString = "EEE, MMM d 'at' h:mm a",
) {
  const date = new Date(dateString)
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
  return formatter.format(date)
}

export function getFullTimezoneDisplay(timeZone: string) {
  return timeZone.replace("_", " ")
}

