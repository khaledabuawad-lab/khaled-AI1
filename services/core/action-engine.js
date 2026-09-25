// Provider-neutral action validation/execution boundary.
// Credentials and provider-specific API calls must remain outside this module.
export function createAction(type, payload) {
  return { id: crypto.randomUUID(), type, payload, status: "pending", createdAt: new Date().toISOString() };
}
export function canExecute(action) {
  return Boolean(action && action.type && action.status === "pending");
}