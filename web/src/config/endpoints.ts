/**
 * API and WebSocket endpoints configuration
 */

const authServer = "https://auth.tensamin.net";

// Auth API endpoints
export const usernameToId = authServer + "/api/get/id/";
export const user = authServer + "/api/get/";
export const change = authServer + "/api/change/";
export const callToken = authServer + "/api/call_token/";

// Documentation links
export const termsOfService =
  "https://docs.tensamin.net/legal/terms-of-service";
export const privacyPolicy = "https://docs.tensamin.net/legal/privacy-policy";

// WebSocket endpoints
export const clientWss = "wss://app.tensamin.net/ws/client/";
export const anonymousClientWss = "wss://app.tensamin.net/ws/anonymous_client/";
export const callServer = "wss://call.tensamin.net";

// Audio CDN
export const noiseSuppressionCdn =
  process.env.NODE_ENV === "development"
    ? "http://localhost:9187/audio/"
    : "https://tensamin.net/audio/";

// Legacy exports for backwards compatibility (to be removed after migration)
export const username_to_id = usernameToId;
export const tos = termsOfService;
export const pp = privacyPolicy;
export const client_wss = clientWss;
export const anonymous_client_wss = anonymousClientWss;
export const call = "call.tensamin.net";
export const noise_suppression_cdn = noiseSuppressionCdn;
