// Returns a session-scoped client ID (per tab). Uses sessionStorage so each tab has its own id.
export function getClientId() {
  try {
    let id = sessionStorage.getItem("authClientId");
    if (!id) {
      // Prefer crypto.randomUUID when available
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
      ) {
        id = crypto.randomUUID();
      } else {
        id = `cid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }
      sessionStorage.setItem("authClientId", id);
    }
    return id;
  } catch (e) {
    // sessionStorage may not be available in some environments; fallback to a non-persistent id
    return `cid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
