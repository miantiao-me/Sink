export function getDashboardLinkDetailUrl(slug: string): string {
  return `/dashboard/link?slug=${encodeURIComponent(slug)}`
}
