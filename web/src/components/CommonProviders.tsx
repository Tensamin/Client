import { CallProvider } from "@/context/call";
import { MessageProvider } from "@/context/message";
import { SocketProvider } from "@/context/socket";
import { UserProvider } from "@/context/user";

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
