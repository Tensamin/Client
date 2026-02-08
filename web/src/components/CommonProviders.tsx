import { CallProvider } from "@/context/call/CallContext";
import { MessageProvider } from "@/context/MessageContext";
import { SocketProvider } from "@/context/SocketContext";
import { UserProvider } from "@/context/UserContext";

export default function CommonProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SocketProvider>
      <UserProvider>
        <CallProvider>
          <MessageProvider>{children}</MessageProvider>
        </CallProvider>
      </UserProvider>
    </SocketProvider>
  );
}
