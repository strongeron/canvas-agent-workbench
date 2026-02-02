export function getBaseDashboardPath(url: string) {
  if (url.includes("/teacher")) return "/teacher"
  if (url.includes("/student")) return "/student"
  return "/"
}

