"use client";

/**
 * AuthenticatedCallAdapter
 *
 * This adapter bridges the authenticated call contexts (useCallContext, useSubCallContext, useUserContext)
 * to the new core context system (CallSessionContext, UserDataContext).
 *
 * This allows the core call components to work in authenticated mode by wrapping them
 * with this adapter, which translates the authenticated context values to the core context format.
 */

import { type ReactNode } from "react";

// Core Context Imports
import { UserDataProvider, type UserData } from "./UserDataContext";

// Authenticated Context Imports
import { useUserContext } from "@/context/user";

// Types
type AuthenticatedCallAdapterProps = {
  children: ReactNode;
};

/**
 * Inner component that reads from authenticated contexts and provides core contexts
 */
function AuthenticatedCallAdapterInner({
  children,
}: AuthenticatedCallAdapterProps) {
  const userContext = useUserContext();

  // Convert authenticated user cache to core format
  const convertedUsers = new Map<number, UserData>();
  userContext.fetchedUsers.forEach((user, id) => {
    convertedUsers.set(id, {
      id: user.id,
      username: user.username,
      display: user.display,
      avatar: user.avatar,
      about: user.about,
      status: user.status,
      state: user.state,
      loading: user.loading,
    });
  });

  // Create a fetch function that uses the authenticated context
  const fetchUser = async (userId: number): Promise<UserData | null> => {
    const user = await userContext.get(userId, false);
    if (!user) return null;
    return {
      id: user.id,
      username: user.username,
      display: user.display,
      avatar: user.avatar,
      about: user.about,
      status: user.status,
      state: user.state,
      loading: user.loading,
    };
  };

  return (
    <UserDataProvider
      initialUsers={convertedUsers}
      ownId={userContext.ownId ?? null}
      fetchUser={fetchUser}
    >
      {children}
    </UserDataProvider>
  );
}

/**
 * Wrapper component that can be used to wrap core call components
 * when in authenticated mode.
 *
 * Usage:
 * ```tsx
 * import { AuthenticatedCallAdapter, CallContent } from "@/components/call/core";
 *
 * function MyCallPage() {
 *   return (
 *     <AuthenticatedCallAdapter>
 *       <CallContent />
 *     </AuthenticatedCallAdapter>
 *   );
 * }
 * ```
 */
export function AuthenticatedCallAdapter({
  children,
}: AuthenticatedCallAdapterProps) {
  return (
    <AuthenticatedCallAdapterInner>{children}</AuthenticatedCallAdapterInner>
  );
}

/**
 * Higher-order component that wraps a component with the authenticated call adapter
 */
export function withAuthenticatedCallAdapter<P extends object>(
  WrappedComponent: React.ComponentType<P>,
): React.FC<P> {
  const WithAdapter: React.FC<P> = (props) => {
    return (
      <AuthenticatedCallAdapter>
        <WrappedComponent {...props} />
      </AuthenticatedCallAdapter>
    );
  };

  WithAdapter.displayName = `withAuthenticatedCallAdapter(${WrappedComponent.displayName || WrappedComponent.name || "Component"})`;

  return WithAdapter;
}

export default AuthenticatedCallAdapter;
