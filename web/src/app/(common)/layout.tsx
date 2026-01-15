import { CallProvider } from "@/context/call";
import { MessageProvider } from "@/context/message";
import { SocketProvider } from "@/context/socket";
import { UserProvider } from "@/context/user";

import Navbar from "@/components/Navbar";
import Main from "@/components/sidebar/Main";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SocketProvider>
      <UserProvider>
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
      </UserProvider>
    </SocketProvider>
  );
}
