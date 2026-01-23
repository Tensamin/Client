"use client";

// Package Imports
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

// Types
export type UserData = {
  id: number;
  username: string;
  display: string;
  avatar?: string | null;
  about?: string;
  status?: string;
  state?: string;
  loading?: boolean;
};

export type UserDataContextValue = {
  // User data cache
  fetchedUsers: Map<number, UserData>;

  // Fetch user data (can be overridden by mode)
  get: (userId: number, forceRefresh?: boolean) => Promise<UserData | null>;

  // Current user's ID (for anonymous, this is the temporary user ID)
  ownId: number | null;

  // Premium status (anonymous users are never premium)
  ownUserHasPremium: boolean;
};

const UserDataContext = createContext<UserDataContextValue | null>(null);

export function useUserData() {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error("useUserData must be used within UserDataProvider");
  }
  return context;
}

// Optional hook for gradual migration
export function useMaybeUserData() {
  return useContext(UserDataContext);
}

// Simple provider for anonymous mode with pre-populated user data
export function UserDataProvider({
  children,
  initialUsers = new Map(),
  ownId = null,
  fetchUser,
}: {
  children: ReactNode;
  initialUsers?: Map<number, UserData>;
  ownId?: number | null;
  fetchUser?: (userId: number) => Promise<UserData | null>;
}) {
  const [fetchedUsers, setFetchedUsers] = useState<Map<number, UserData>>(initialUsers);

  const get = useCallback(
    async (userId: number, forceRefresh = false): Promise<UserData | null> => {
      // Check cache first
      const cached = fetchedUsers.get(userId);
      if (cached && !cached.loading && !forceRefresh) {
        return cached;
      }

      // If we have a custom fetch function, use it
      if (fetchUser) {
        try {
          // Mark as loading
          setFetchedUsers((prev) => {
            const next = new Map(prev);
            next.set(userId, {
              id: userId,
              username: "",
              display: "Loading...",
              loading: true,
            });
            return next;
          });

          const userData = await fetchUser(userId);

          if (userData) {
            setFetchedUsers((prev) => {
              const next = new Map(prev);
              next.set(userId, { ...userData, loading: false });
              return next;
            });
            return userData;
          }
        } catch (error) {
          console.error("Failed to fetch user:", userId, error);
        }
      }

      // Return cached or fallback
      return (
        fetchedUsers.get(userId) ?? {
          id: userId,
          username: `user_${userId}`,
          display: `User ${userId}`,
          loading: false,
        }
      );
    },
    [fetchedUsers, fetchUser]
  );

  const value: UserDataContextValue = {
    fetchedUsers,
    get,
    ownId,
    ownUserHasPremium: false, // Anonymous users are never premium
  };

  return (
    <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>
  );
}

// Re-export for convenience
export { UserDataContext };
