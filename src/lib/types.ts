export interface JWK {
  kty: string;
  crv: string;
  x?: string;
  d?: string;
}

export interface BasicSuccessMessage {
  success: boolean;
  message: string;
}

export interface AdvancedSuccessMessage {
  type: string;
  log: LogBody;
  data: any;
  id: string;
}

export interface LogBody {
  log_level: number;
  message: string;
}

export interface User {
  uuid: string;
  username: string;
  display: string;
  avatar: string | null;
  about: string | null;
  status: string | null;
  sub_level: number;
  sub_end: number;
  public_key: string;
  created_at: string;
  loading: boolean;
}

declare global {
  interface Window {
    keyring?: {
      get: (app: string, id?: string) => Promise<string | undefined>;
    };
  }
}

export {};
