import * as React from "react";

export const context = React.createContext<contextType | undefined>(undefined);

export default function Provider(props: { children: React.ReactNode }) {
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
  const ctx = React.useContext(context);
  if (!ctx) {
    throw new Error("useNotifications must be used within a ChatProvider");
  }
  return ctx;
}
