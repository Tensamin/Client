import { CallProvider } from "@/context/call/CallContext";
import { MessageProvider } from "@/context/MessageContext";
import { SocketProvider } from "@/context/SocketContext";
import { UserProvider } from "@/context/UserContext";
import TauriWrapper from "@/context/TauriContext";

import Navbar from "@/components/Navbar";
import Main from "@/components/sidebar/Main";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <UserProvider>
        <TauriWrapper>
          <CallProvider>
            <MessageProvider>
              <div className="w-full h-screen flex bg-sidebar">
                <Main />
                <div className="flex-1 h-full flex flex-col">
                  <Navbar />
                  <div className="flex-1 bg-background rounded-tl-xl border overflow-auto">
                    {children}
                  </div>
                </div>
              </div>
            </MessageProvider>
          </CallProvider>
        </TauriWrapper>
      </UserProvider>
    </SocketProvider>
  );
}
