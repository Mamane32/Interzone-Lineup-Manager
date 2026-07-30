const DEFAULT_AUTH_DESTINATION = "/team/reset-password";

/**
 * Accept only same-origin, root-relative application paths. Callback
 * destinations are rejected because they can create redirect loops.
 */
export function getSafeAuthDestination(
  candidate: string | null,
  origin: string,
  fallback = DEFAULT_AUTH_DESTINATION
) {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  try {
    decodeURI(candidate);
    const destination = new URL(candidate, origin);
    if (destination.origin !== origin || destination.pathname === "/auth/callback") {
      return fallback;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}

export function addAuthError(destination: string, error: "expired" | "callback") {
  const url = new URL(destination, "http://auth.local");
  url.searchParams.set("error", error);
  return `${url.pathname}${url.search}${url.hash}`;
}
