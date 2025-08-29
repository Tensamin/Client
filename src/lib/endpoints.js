let authServer = process.env.NODE_ENV === "development" ? "https://devauth.tensamin.methanium.net" : "https://auth.tensamin.methanium.net"

export let endpoint = {
    username_to_uuid: authServer + "/api/get/uuid/",
    user: authServer + "/api/get/",
    change: authServer + "/api/change/",

    tos: "https://docs.tensamin.methanium.net/legal/terms-of-service",
    pp: "https://docs.tensamin.methanium.net/legal/privacy-policy",

    client_wss: "wss://tensamin.methanium.net/ws/client/",
    call_wss: "wss://tensamin.methanium.net/ws/call/",

    webauthn_register_options: authServer + "/api/register/options/",
    webauthn_register_verify: authServer + "/api/register/verify/",
    webauthn_login_options: authServer + "/api/login/options/",
    webauthn_login_verify: authServer + "/api/login/verify/",

    sound_call: "/sounds/call.wav",
    sound_message: "/sounds/message.wav",
}