/**
 * WebSocket message type definitions
 * TypeScript types for all WebSocket communication payloads
 * 
 * Renamed from communicationValues.ts for clarity
 */

import {
  Conversation,
  UserId,
  UserState,
  CallId,
  RawMessage,
  Community,
  User,
} from "./types";

// ============================================================================
// Anonymous Call Types
// ============================================================================

export type call_set_anonymous_joining = {
  link: string;
};

export type anonymous_call_member = {
  user_id: number;
  username: string;
  display: string;
  avatar: string;
};

export type anonymous_call_data = {
  call_id: string;
  call_members: anonymous_call_member[];
  call_token: string;
};

export type anonymous_identification_response = {
  username: string;
  display: string;
  avatar: string;
  user_id: number;
  call_state: anonymous_call_data;
};

// ============================================================================
// User Data Types
// ============================================================================

export type get_user_data = User;

export type get_chats = {
  user_ids: Conversation[];
};

// ============================================================================
// Connection Types
// ============================================================================

export type ping = {
  ping_iota: number;
};

export type identification = {
  challenge: string;
  public_key: string;
};

// ============================================================================
// State Types
// ============================================================================

export type client_changed = {
  user_id: UserId;
  user_state: UserState;
};

export type get_states = {
  user_states: Record<UserId, UserState>;
};

// ============================================================================
// Call Types
// ============================================================================

export type call_invite = {
  sender_id: UserId;
  call_id: CallId;
};

export type call_token = {
  call_token: string;
};

// ============================================================================
// Message Types
// ============================================================================

export type message_live = {
  sender_id: UserId;
  send_time: number;
  message: string;
};

export type messages_get = {
  messages: RawMessage[];
};

// ============================================================================
// Community Types
// ============================================================================

export type get_communities = {
  communities: Community[];
};

// ============================================================================
// Settings Types
// ============================================================================

export type settings_list = {
  settings: string[];
};

export type settings_load = {
  settings_name: string;
  payload: string;
};

// ============================================================================
// Error Types
// ============================================================================

export type Error = {
  id: string;
  type:
    | "error"
    | "error_no_iota"
    | "error_invalid_public_key"
    | "error_not_authenticated"
    | "error_invalid_data"
    | "error_internal";
  data: DataContainer;
};

// ============================================================================
// Generic Types
// ============================================================================

export type DataContainer = unknown;

export type Parent<T = DataContainer> = {
  id: string;
  type: string;
  data: T;
};
