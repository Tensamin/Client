export function displayCallId(callId: string) {
  return callId.slice(0, 4) + "..." + callId.slice(-4);
}
