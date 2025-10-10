export type RawMessage = {
  sent_by_self?: boolean;
  avatar?: boolean;
  display?: boolean;
  timestamp: number;
  tint?: string;
  files?: File[];
  content: string;
};

export type Message = {
  send_to_server: boolean;
  sender: string;
  avatar?: boolean;
  display?: boolean;
  timestamp: number;
  tint?: string;
  files?: File[];
  content: string;
};

export type Messages = {
  messages: Message[];
  next: number;
  previous: number;
};

export type JWK = {
  kty: string;
  crv: string;
  x?: string;
  d?: string;
};

export type BasicSuccessMessage = {
  success: boolean;
  message: string;
};

export type UserState =
  | "NONE"
  | "ONLINE"
  | "IDLE"
  | "DND"
  | "USER_OFFLINE"
  | "IOTA_OFFLINE";

export type AdvancedSuccessMessageData = {
  content?: string | null;
  messages?: RawMessage[] | null;
  user_id?: string | null;
  user_ids?: Conversation[] | null;
  private_key_hash?: string | null;
  last_ping?: number | null;
  ping_iota?: number | null;
  chat_partner_id?: string | null;
  loaded_messages?: number | null;
  message_amount?: number | null;
  communities?: Community[] | null;
  user_states?: [] | null;
  user_state?: string | null;
  amount?: number | null;
  offset?: number | null;
  user_status?: string | null;
  receiver_id?: string | null;
};

export type AdvancedSuccessMessage = {
  type: string;
  data: AdvancedSuccessMessageData;
  id: string;
};

export type File = {
  name: string;
  id: string;
  type:
    | "image"
    | "image_top_right"
    | "video"
    | "audio"
    | "json"
    | "txt"
    | "pdf"
    | "file";
};

export type User = {
  uuid: string;
  username: string;
  display: string;
  avatar: string | null;
  about: string | null;
  status: string | null;
  state: string;
  sub_level: number;
  sub_end: number;
  public_key: string;
  created_at: string;
  loading: boolean;
  badges?: string[];
};

export type ErrorType = {
  name: string;
  message: string;
};

export type Conversation = {
  user_id: string;
  last_message_at: number;
  call_active: boolean;
};

export type Community = {
  community_address: string;
  community_title: string;
  position: string;
};

export const systemUser: User = {
  uuid: "SYSTEM",
  username: "SYSTEM",
  public_key: "",
  created_at: "0",
  display: "Tensamin",
  avatar: "/assets/images/systemUser.webp",
  about: "",
  loading: false,
  state: "NONE",
  status: "",
  sub_end: 0,
  sub_level: 0,
  badges: ["System"],
};

export type OfflineData = {
  user: User;
  storeTime: number;
};

declare global {
  interface Window {
    keyring?: {
      get: (app: string, id?: string) => Promise<string | undefined>;
    };
  }
}

export {};
