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

export type AdvancedSuccessMessage = {
  type: string;
  log: LogBody;
  data: any;
  id: string;
};

export type LogBody = {
  log_level: number;
  message: string;
};

export type User = {
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
};

export type Error = {
  message: string;
};

declare global {
  interface Window {
    keyring?: {
      get: (app: string, id?: string) => Promise<string | undefined>;
    };
  }
}

export {};
