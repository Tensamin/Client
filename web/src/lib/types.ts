export type UserId = UnixTimestamp;
export type UnixTimestamp = number;
export type CallId = string;

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
  sender: UserId;
  timestamp: number;
  files?: File[];
  content: string;
  showAvatar?: boolean;
  showName?: boolean;
  tint?: string;
};

export type MessageGroup = {
  id: string;
  sender: UserId;
  timestamp: number;
  messages: Message[];
  showAvatar?: boolean;
  showName?: boolean;
  tint?: string;
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

export type User = {
  id: UserId;
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

export type Conversation = {
  user_id: UserId;
  calls?: CallId[];
  last_message_at: UnixTimestamp;
};

export type Community = {
  community_address: string;
  community_title: string;
  position: string;
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
