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

export type MessageGroup = {
  id: string;
  sender: string;
  avatar?: boolean;
  display?: boolean;
  timestamp: number;
  tint?: string;
  messages: Message[];
};

export type Messages = {
  messages: MessageGroup[];
  next: number;
  previous: number;
};

export type BasicSuccessMessage = {
  success: boolean;
  message: string;
};

export type JWK = {
  kty: string;
  crv: string;
  x?: string;
  d?: string;
};

export type UpdatePayload = {
  version: string | null;
  releaseName: string | null;
  releaseNotes: string | null;
  releaseDate: number | null;
  url: string;
};

export type UserState =
  | "NONE"
  | "ONLINE"
  | "IDLE"
  | "DND"
  | "USER_OFFLINE"
  | "IOTA_OFFLINE";

export type AdvancedSuccessMessageData = {
  message?: string | null;
  send_time?: string | null;
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
  settings?: string[] | null;
  user_status?: string | null;
  receiver_id?: string | null;
  sender_id?: string | null;
  call_id?: string | null;
  call_state?: string | null;
  receiver?: string | null;
  settings_name?: string | null;
  token?: string | null;
  call_secret?: string | null;
  call_secret_sha?: string | null;
  payload?:
    | RTCIceCandidate
    | RTCSessionDescriptionInit
    | StoredSettings
    | string
    | null;
  about?: {
    [key: string]: {
      state: string;
      streaming: boolean;
    };
  } | null;
};

export type Language = Record<string, string>;
export type Value = string | boolean | number | object | Language | object[];
export type StoredSettings = {
  [key: string]: Value;
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
  avatar?: string;
  about?: string;
  status?: string;
  state: string;
  sub_level: number;
  sub_end: number;
  public_key: string;
  created_at: string;
  loading: boolean;
  //badges?: string[];
};

export type ErrorType = {
  name: string;
  message: string;
};

export type Conversation = {
  user_id: string;
  call_id?: string;
  last_message_at: number;
};

export type Community = {
  community_address: string;
  community_title: string;
  position: string;
};

export type CallUser = {
  state: string;
  active: boolean;
  stream?: MediaStream;
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
  //badges: ["System"],
};

export const fallbackUser: User = {
  uuid: "",
  username: "",
  about: "",
  sub_level: 0,
  sub_end: 0,
  created_at: "",
  public_key: "",
  display: "",
  avatar: "",
  status: "",
  state: "NONE",
  loading: true,
};

export type StoredUser = {
  user: User;
  storeTime: number;
};

export type OfflineData = {
  storedUsers: StoredUser[];
  storedConversations: Conversation[];
  storedCommunities: Community[];
};

export type UserAudioSettings = {
  [key: string]: number;
};
