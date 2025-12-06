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
  sender: number;
  avatar?: boolean;
  display?: boolean;
  timestamp: number;
  tint?: string;
  files?: File[];
  content: string;
};

export type MessageGroup = {
  id: string;
  sender: number;
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

export type AvatarSizes =
  | "small"
  | "medium"
  | "large"
  | "extraLarge"
  | "jumbo"
  | "gigantica";

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

export type UpdateLogPayload = {
  level: "info" | "error";
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
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
  user_id?: number | null;
  user_ids?: Conversation[] | null;
  private_key_hash?: string | null;
  last_ping?: number | null;
  ping_iota?: number | null;
  chat_partner_id?: number | null;
  loaded_messages?: number | null;
  message_amount?: number | null;
  communities?: Community[] | null;
  user_states?: Record<number, string> | null;
  user_state?: string | null;
  amount?: number | null;
  offset?: number | null;
  settings?: string[] | null;
  user_status?: string | null;
  receiver_id?: number | null;
  sender_id?: number | null;
  call_id?: string | null;
  call_state?: string | null;
  receiver?: number | null;
  settings_name?: string | null;
  token?: string | null;
  call_secret?: string | null;
  call_secret_sha?: string | null;
  call_token?: string | null;
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
export type Value =
  | string
  | boolean
  | number
  | object
  | Language
  | object[]
  | null;
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
  id: number;
  username: string;
  display: string;
  avatar?: string;
  about?: string;
  status?: string;
  state: string;
  sub_level: number;
  sub_end: number;
  public_key: string;
  loading: boolean;
  //badges?: string[];
};

export type ErrorType = {
  name: string;
  message: string;
};

export type Conversation = {
  user_id: number;
  calls?: string[];
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
  id: 0,
  username: "SYSTEM",
  public_key: "",
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
  id: 0,
  username: "",
  about: "",
  sub_level: 0,
  sub_end: 0,
  public_key: "",
  display: "",
  avatar: "",
  status: "",
  state: "NONE",
  loading: true,
};

export type OfflineData = {
  storedConversations: Conversation[];
  storedCommunities: Community[];
};

export type UserAudioSettings = {
  [key: string]: number;
};
