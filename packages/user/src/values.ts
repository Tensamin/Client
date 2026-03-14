import type { User } from "./context";

export const failedUser: User = {
  user_id: 0,
  display: "Failed",
  iota_id: 0,
  omikron_connections: [],
  online_status: "user_offline",
  public_key: "",
  sub_end: 0,
  sub_level: 0,
  username: "failed",
};
