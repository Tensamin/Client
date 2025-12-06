import {
  Conversation,
  UserId,
  UserState,
  CallId,
  RawMessage,
  Community,
} from "./types";

export type get_chats = {
  user_ids: Conversation[];
};

export type ping = {
  ping_iota: number;
};

export type identification = {
  user_status: UserState;
};

export type client_changed = {
  user_id: UserId;
  user_state: UserState;
};

export type get_states = {
  user_states: Record<UserId, UserState>;
};

export type call_invite = {
  sender_id: UserId;
  call_id: CallId;
};

export type call_token = {
  call_token: string;
};

export type message_live = {
  sender_id: UserId;
  send_time: number;
  message: string;
};

export type messages_get = {
  messages: RawMessage[];
};

export type get_communities = {
  communities: Community[];
};

export type settings_list = {
  settings: string[];
};

export type settings_load = {
  settings_name: string;
  payload: string;
};

export type DataContainer = unknown;
export type Parent<T = DataContainer> = {
  id: string;
  type: string;
  data: T;
};
