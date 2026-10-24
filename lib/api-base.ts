/**
 * Resolve API base URL for local + LAN access.
 * When the app is opened via a machine IP (not localhost), call backend on the same host:8005.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()

  if (typeof window !== "undefined") {
    const host = window.location.hostname
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:8005/api`
    }
  }

  return envUrl || "http://127.0.0.1:8005/api"
}
