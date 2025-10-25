const authServer =
  process.env.NODE_ENV === "development"
    ? "https://dev-auth.tensamin.net"
    : "https://auth.tensamin.net";

export const username_to_uuid = authServer + "/api/get/uuid/";
export const user = authServer + "/api/get/";
export const change = authServer + "/api/change/";

export const tos = "https://docs.tensamin.net/legal/terms-of-service";
export const pp = "https://docs.tensamin.net/legal/privacy-policy";

export const client_wss = "wss://app.tensamin.net/ws/client/";
export const call_wss = "wss://app.tensamin.net/ws/call/";

export const webauthn_register_options = authServer + "/api/register/options/";
export const webauthn_register_verify = authServer + "/api/register/verify/";
export const webauthn_login_options = authServer + "/api/login/options/";
export const webauthn_login_verify = authServer + "/api/login/verify/";

export const sound_call = "/sounds/call.wav";
export const sound_message = "/sounds/message.wav";
