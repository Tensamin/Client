const authServer =
  process.env.NODE_ENV === "development"
    ? "https://devauth.tensamin.methanium.net"
    : "https://auth.tensamin.methanium.net";

export const username_to_uuid = authServer + "/api/get/uuid/";
export const user = authServer + "/api/get/";
export const change = authServer + "/api/change/";

export const tos = "https://tensamin.methanium.net/docs/legal/terms-of-service";
export const pp = "https://tensamin.methanium.net/docs/legal/privacy-policy";

export const client_wss = "wss://tensamin.methanium.net/ws/client/";
export const call_wss = "wss://tensamin.methanium.net/ws/call/";

export const webauthn_register_options = authServer + "/api/register/options/";
export const webauthn_register_verify = authServer + "/api/register/verify/";
export const webauthn_login_options = authServer + "/api/login/options/";
export const webauthn_login_verify = authServer + "/api/login/verify/";

export const sound_call = "/sounds/call.wav";
export const sound_message = "/sounds/message.wav";
