import { Message } from "@/components/chat/message";

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

export type AdvancedSuccessMessageData = {
  message_chunk?: Message[] | null;
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
};

export type AdvancedSuccessMessage = {
  type: string;
  data: AdvancedSuccessMessageData;
  id: string;
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

declare global {
  interface Window {
    keyring?: {
      get: (app: string, id?: string) => Promise<string | undefined>;
    };
  }
}

export {};
