import * as React from "react";

export const context = React.createContext<contextType | undefined>(undefined);

/**
 * Executes Provider.
 * @param props Parameter props.
 * @returns unknown.
 */
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

/**
 * Executes useNotifications.
 * @param none This function has no parameters.
 * @returns contextType.
 */
export function useNotifications(): contextType {
  const ctx = React.useContext(context);
  if (!ctx) {
    throw new Error("useNotifications must be used within a ChatProvider");
  }
  return ctx;
}
