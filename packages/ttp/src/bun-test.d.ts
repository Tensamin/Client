declare module "bun:test" {
  export const describe: (...args: unknown[]) => unknown;
  export const test: (...args: unknown[]) => unknown;
  export const it: (...args: unknown[]) => unknown;
  export const expect: (value: unknown) => {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toContain: (expected: unknown) => void;
    toThrow: (expected?: unknown) => void;
  };
}
