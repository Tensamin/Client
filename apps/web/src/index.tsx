import * as React from "react";
import { createRoot } from "react-dom/client";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import "./index.css";

import NotFound from "@/routes/404";

import RootLayout from "./routes/layout";
import AppLayout from "./routes/app/layout";

import Home from "@/routes/app/home";
import ChatScreen from "@tensamin/chat/screen";
import ChatContext from "@tensamin/chat/context";
import Login from "@/routes/screens/login";
import Signup from "@/routes/screens/signup";

const wrapper = document.getElementById("root");

if (!wrapper) {
  throw new Error("Missing root element");
}

// @ts-expect-error Declare global function
window.setLogLevelToMax = () => {
  localStorage.setItem("log_level", String(1000));
  location.reload();
};

function RootShell() {
  React.useEffect(() => {
    try {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

      document.documentElement.classList.toggle("dark", mediaQuery.matches);

      const handleChange = (event: MediaQueryListEvent) => {
        document.documentElement.classList.toggle("dark", event.matches);
      };

      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    } catch {
      return;
    }
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden">
      <RootLayout>
        <Outlet />
      </RootLayout>
    </div>
  );
}

function AppShell() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function Chat() {
  return (
    <ChatContext>
      <ChatScreen />
    </ChatContext>
  );
}

const rootRoute = createRootRoute({
  component: RootShell,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AppShell,
});

const homeRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: Home,
});

const chatRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "chat",
  component: Chat,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "login",
  component: Login,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "signup",
  component: Signup,
});

const routeTree = rootRoute.addChildren([
  appRoute.addChildren([homeRoute, chatRoute]),
  loginRoute,
  signupRoute,
]);

const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFound,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(wrapper).render(<RouterProvider router={router} />);