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

declare global {
  interface Window {
    keyring?: {
      get: (app: string, id?: string) => Promise<string | undefined>;
    };
  }
}

export {};
