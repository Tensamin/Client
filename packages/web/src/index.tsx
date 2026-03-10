import { createEffect } from "solid-js";
import { render } from "solid-js/web";
import { Route, Router } from "@solidjs/router";
import "./index.css";

import NotFound from "@/routes/404";

// Layouts
import RootLayout from "./routes/layout";
import AppLayout from "./routes/app/layout";

// Pages
import Home from "@/routes/app/home";
import ChatScreen from "@tensamin/chat/screen";
import ChatContext from "@tensamin/chat/context";
import Login from "@/routes/screens/login";
import Signup from "@/routes/screens/signup";

import { getMessages } from "@tensamin/chat/behaviour-conversation";

// Render
const wrapper = document.getElementById("root")!;

// @ts-expect-error Declare global function
window.setLogLevelToMax = () => {
  localStorage.setItem("log_level", String(1000));
  location.reload();
};

render(
  () => (
    <Router
      root={(props) => {
        // Theme Detection
        createEffect(() => {
          try {
            const mediaQuery = window.matchMedia(
              "(prefers-color-scheme: dark)",
            );

            // Initial check
            document.documentElement.classList.toggle(
              "dark",
              mediaQuery.matches,
            );

            // Listen to changes
            const handleChange = (e: MediaQueryListEvent) => {
              document.documentElement.classList.toggle("dark", e.matches);
            };

            mediaQuery.addEventListener("change", handleChange);

            // Cleanup
            return () => mediaQuery.removeEventListener("change", handleChange);
          } catch {
            /* theme detection not supported */
          }
        });

        return (
          <div class="w-screen h-screen overflow-hidden">{props.children}</div>
        );
      }}
    >
      <Route path="/" component={RootLayout}>
        {/* App */}
        <Route path="/" component={AppLayout}>
          <Route path="/" component={Home} />
          <Route path="/chat" component={Chat} />
        </Route>

        {/* Screens */}
        <Route path="/">
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" component={NotFound} />
    </Router>
  ),
  wrapper,
);

function Chat() {
  return (
    <ChatContext getMessages={getMessages}>
      <ChatScreen />
    </ChatContext>
  );
}
