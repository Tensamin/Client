import { createContext, useContext } from "solid-js";
import type { ParentProps } from "solid-js";

export const context = createContext<contextType>();

export default function Provider(props: ParentProps) {
  // live_messages

  return (
    <context.Provider value={{ test: () => {} }}>
      {props.children}
    </context.Provider>
  );
}

type contextType = {
  test: () => void;
};

export function useNotifications(): contextType {
  const ctx = useContext(context);
  if (!ctx) {
    throw new Error("useNotifications must be used within a ChatProvider");
  }
  return ctx;
}
