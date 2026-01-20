"use client";

// Package Imports
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

// Lib Imports
import * as CommunicationValue from "@/lib/communicationValues";
import {
  Community,
  Conversation,
  UpdateLogPayload,
  UpdatePayload,
  User,
  UserState,
} from "@/lib/types";
import { getDisplayFromUsername } from "@/lib/utils";

// Context Imports
import { useCryptoContext } from "@/context/crypto";
import { useSocketContext } from "@/context/socket";
import { rawDebugLog, useStorageContext } from "@/context/storage";
import { usePathname, useSearchParams } from "next/navigation";

// Types
type UserContextType = {
  appUpdateInformation: UpdatePayload | undefined;
  get: (id: number, refetch: boolean) => Promise<User>;
  ownId: number;
  failedMessagesAmount: number;
  setFailedMessagesAmount: (amount: number) => void;
  currentReceiverId: number;
  currentReceiverSharedSecret: string;
  conversations: Conversation[];
  communities: Community[];
  setConversations: (conversations: Conversation[]) => void;
  setCommunities: (communities: Community[]) => void;
  refetchConversations: () => Promise<void>;
  reloadUsers: boolean;
  setReloadUsers: (reload: boolean) => void;
  doCustomEdit: (id: number, user: User) => void;
  fetchedUsers: Map<number, User>;
  ownState: UserState;
  setOwnState: (state: UserState) => void;
  updateConversationPosition: (userId: number) => void;

  ownUserData: User | null;
  ownUserHasPremium: boolean;
};

// Main
const UserContext = createContext<UserContextType | null>(null);

export function useUserContext() {
  const context = useContext(UserContext);
  if (!context) throw new Error("hook outside of provider");
  return context;
}

export function UserProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [fetchedUsers, setFetchedUsers] = useState<Map<number, User>>(
    new Map(),
  );
  const fetchedUsersRef = useRef(fetchedUsers);
  const prevLastMessageRef = useRef<unknown>(null);
  const inFlightRef = useRef<Map<number, Promise<User>>>(new Map());

  const pathname = usePathname().split("/");
  const searchParams = useSearchParams();
  const page = pathname[1] || "home";
  const currentReceiverId =
    page === "chat" ? (Number(searchParams.get("id")) ?? 0) : 0;

  const { data } = useStorageContext();
  const { ownId, get_shared_secret, privateKey } = useCryptoContext();
  const { send, identified, lastMessage } = useSocketContext();
  const [currentReceiverSharedSecret, setCurrentReceiverSharedSecret] =
    useState<string>("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [failedMessagesAmount, setFailedMessagesAmount] = useState<number>(0);
  const [reloadUsers, setReloadUsers] = useState<boolean>(false);
  const [ownState, setOwnState] = useState<UserState>("ONLINE");
  const [ownUserHasPremium, setOwnUserHasPremium] = useState<boolean>(false);
  const [ownUserData, setOwnUserData] = useState<User | null>(null);

  const updateFetchedUsers = useCallback(
    (updater: (next: Map<number, User>) => void) => {
      setFetchedUsers((prev) => {
        const next = new Map(prev);
        updater(next);
        fetchedUsersRef.current = next;
        return next;
      });
    },
    [],
  );

  const get = useCallback(
    async (id: number, refetch: boolean = false): Promise<User> => {
      try {
        if (!id || id === 0) {
          throw new Error("Invalid ID");
        }

        if (inFlightRef.current.has(id) && !refetch) {
          return inFlightRef.current.get(id)!;
        }

        const hasUser = fetchedUsersRef.current.has(id);
        const existingUser = hasUser
          ? fetchedUsersRef.current.get(id)
          : undefined;
        const shouldFetch = refetch || !hasUser;

        if (hasUser && !shouldFetch) {
          rawDebugLog("User Context", "User already fetched", "", "yellow");
          return existingUser!;
        }

        setReloadUsers(true);

        const fetchPromise = (async () => {
          try {
            rawDebugLog("User Context", "Fetching user", { id }, "yellow");
            const data = (await send("get_user_data", {
              user_id: id,
            })) as CommunicationValue.get_user_data;

            const apiUserData: User = {
              id,
              username: data.username,
              display: getDisplayFromUsername(data.username, data.display),
              avatar: data.avatar
                ? `data:image/webp;base64,${data.avatar}`
                : undefined,
              about: data.about,
              status: data.status,
              sub_level: data.sub_level,
              sub_end: data.sub_end,
              public_key: data.public_key,
              state: data.state,
              loading: false,
            };

            updateFetchedUsers((draft) => {
              draft.set(id, apiUserData);
            });

            inFlightRef.current.delete(id);

            return apiUserData;
          } catch (error: unknown) {
            inFlightRef.current.delete(id);

            const currentExisting = fetchedUsersRef.current.get(id);
            if (currentExisting) {
              const failedUser: User = {
                ...currentExisting,
                about: String(error),
                loading: false,
              };
              updateFetchedUsers((draft) => {
                draft.set(id, failedUser);
              });
              return failedUser;
            }

            return {
              id: 0,
              username: "failed",
              display: "Failed to load",
              avatar: undefined,
              about: String(error),
              status: "",
              sub_level: 0,
              sub_end: 0,
              public_key: "",
              created_at: new Date().toISOString(),
              state: "NONE",
              loading: false,
            } as User;
          }
        })();

        inFlightRef.current.set(id, fetchPromise);
        return fetchPromise;
      } catch (error: unknown) {
        inFlightRef.current.delete(id);
        throw error;
      }
    },
    [updateFetchedUsers, send],
  );

  // Put user at the top of the conversations list
  const updateConversationPosition = useCallback((userId: number) => {
    setConversations((prev) => {
      const index = prev.findIndex((c) => c.user_id === userId);
      if (index === -1) return prev;

      const conversation = prev[index];
      const newConversations = [...prev];
      newConversations.splice(index, 1);
      newConversations.unshift(conversation);
      return newConversations;
    });
  }, []);

  // Get own user
  useEffect(() => {
    get(ownId).then((user) => {
      setOwnUserData(user);
      setOwnUserHasPremium(user.sub_level > 0);
    });
  }, [ownId, get, setOwnUserData, setOwnUserHasPremium]);

  const refetchConversations = useCallback(async () => {
    await send("get_chats")
      .then((raw) => {
        const data = raw as CommunicationValue.get_chats;

        if (data.user_ids.some((conv) => typeof conv.user_id === "string"))
          toast.warning("User IDs provided as strings, converting to numbers");

        const convertedUserIds = (data.user_ids || []).map((conv) => {
          return {
            ...conv,
            user_id:
              typeof conv.user_id === "string"
                ? Number(conv.user_id)
                : conv.user_id,
          };
        });

        const sortedConversations = convertedUserIds.sort((a, b) => {
          return b.last_message_at - a.last_message_at;
        });

        setConversations(sortedConversations);
      })
      .catch((err) => {
        toast.error("Failed to get conversations");
        rawDebugLog(
          "User Context",
          "Failed to refetch conversations",
          err,
          "red",
        );
      });
  }, [send]);

  // Set current receiver shared secret
  useEffect(() => {
    setFailedMessagesAmount(0);

    if (currentReceiverId === 0) {
      setCurrentReceiverSharedSecret("");
      return;
    }

    let cancelled = false;

    const resolveSharedSecret = async () => {
      try {
        const [otherUser, ownUser] = await Promise.all([
          get(currentReceiverId, false),
          get(ownId, false),
        ]);

        const sharedSecret = await get_shared_secret(
          privateKey,
          ownUser.public_key,
          otherUser.public_key,
        );

        if (!sharedSecret.success) {
          toast.error("Failed to get shared secret for user.");
          if (!cancelled) {
            setCurrentReceiverSharedSecret("0");
          }
          return;
        }

        if (!cancelled) {
          setCurrentReceiverSharedSecret(sharedSecret.message);
        }
      } catch {
        if (!cancelled) {
          setCurrentReceiverSharedSecret("0");
        }
      }
    };

    void resolveSharedSecret();

    return () => {
      cancelled = true;
    };
  }, [currentReceiverId, get, get_shared_secret, ownId, privateKey]);

  useEffect(() => {
    if (!identified) return;
    refetchConversations();
  }, [identified, refetchConversations]);

  // Get initial communities
  useEffect(() => {
    if (!identified) return;

    send("get_communities")
      .then((raw) => {
        const data = raw as CommunicationValue.get_communities;
        setCommunities(data.communities || []);
      })
      .catch(() => {
        toast.error("Failed to get communities");
      });
  }, [identified, send]);

  // Handle socket messages
  const handleSocketMessage = useEffectEvent(
    async (
      message: CommunicationValue.Parent<
        CommunicationValue.client_changed | CommunicationValue.get_states
      >,
    ) => {
      switch (message.type) {
        case "client_changed": {
          const data = message.data as CommunicationValue.client_changed;

          const user = await get(data.user_id, true);
          updateFetchedUsers((draft) => {
            draft.set(user.id, {
              ...user,
              state: data.user_state || "NONE",
            });
          });
          return;
        }
        case "get_states": {
          const data = message.data as CommunicationValue.get_states;

          updateFetchedUsers((draft) => {
            Object.entries(data.user_states).forEach(
              ([stringId, nextState]) => {
                const id = Number(stringId);
                const existingUser = draft.get(id);
                if (existingUser) {
                  draft.set(id, { ...existingUser, state: nextState });
                  return;
                }

                draft.set(id, {
                  id,
                  username: "",
                  display: "",
                  avatar: undefined,
                  about: "",
                  status: "",
                  sub_level: 0,
                  sub_end: 0,
                  public_key: "",
                  state: nextState,
                  loading: true,
                });
              },
            );
          });
          return;
        }
        default:
          return;
      }
    },
  );

  useEffect(() => {
    if (!lastMessage || lastMessage === prevLastMessageRef.current) return;
    prevLastMessageRef.current = lastMessage;
    const data = lastMessage as CommunicationValue.Parent<
      CommunicationValue.client_changed | CommunicationValue.get_states
    >;
    void handleSocketMessage(data);
  }, [lastMessage]);

  // Custom Edit
  const doCustomEdit = useCallback(
    (id: number, user: User) => {
      const newUser = {
        ...user,
        display: getDisplayFromUsername(user.username, user.display),
      };
      updateFetchedUsers((draft) => {
        draft.set(id, newUser);
      });
    },
    [updateFetchedUsers],
  );

  // Electron Update Stuff
  const [appUpdateInformation, setUpdate] = useState<UpdatePayload | undefined>(
    undefined,
  );

  // Load dev update
  useEffect(() => {
    setUpdate(data.fakeUpdateInformation as UpdatePayload | undefined);
  }, [data.fakeUpdateInformation]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // @ts-expect-error ElectronAPI only available in Electron
    const electronAPI = window.electronAPI;
    if (!electronAPI) return;

    const handleUpdatePayload = (
      update: UpdatePayload,
      shouldToast: boolean,
    ) => {
      if (shouldToast) {
        toast.info("There is an update available!", {
          duration: Infinity,
          dismissible: true,
          action: {
            label: "Update",
            onClick: () => {
              electronAPI.doUpdate();
            },
          },
        });
      }

      setUpdate(update);
    };

    const unsubscribeUpdate = electronAPI.onUpdateAvailable(
      (update: UpdatePayload) => {
        handleUpdatePayload(update, true);
      },
    );

    const unsubscribeLogs = electronAPI.onUpdateLog?.(
      (log: UpdateLogPayload) => {
        rawDebugLog("Electron App", "Received Update Log", log, "green");
      },
    );

    void (async () => {
      try {
        const latestUpdate = await electronAPI.getLatestUpdate?.();
        if (latestUpdate) {
          handleUpdatePayload(latestUpdate, false);
        }
      } catch (error) {
        console.warn("Failed to load update metadata", error);
      }
    })();

    return () => {
      unsubscribeUpdate?.();
      unsubscribeLogs?.();
    };
  }, []);

  return (
    <UserContext.Provider
      value={{
        appUpdateInformation,
        get,
        ownId,
        currentReceiverId,
        currentReceiverSharedSecret,
        failedMessagesAmount,
        setFailedMessagesAmount,
        conversations,
        communities,
        setConversations,
        setCommunities,
        refetchConversations,
        reloadUsers,
        setReloadUsers,
        doCustomEdit,
        fetchedUsers,
        ownState,
        setOwnState,
        updateConversationPosition,

        ownUserData,
        ownUserHasPremium,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}
