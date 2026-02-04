import * as React from "react";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { createApiClient } from "@linnet/api-client";
import type { App } from "../../api/src/app";

const apiUrl = import.meta.env.VITE_API_URL;

if (!apiUrl) {
  throw new Error("VITE_API_URL is not defined");
}

const api = createApiClient<App>(apiUrl);

const RootComponent = () => (
  <div style={{ fontFamily: "system-ui", padding: "2rem" }}>
    <h1>Linnet Dashboard</h1>
    <hr />
    <div>
      <Outlet />
    </div>
    <TanStackRouterDevtools position="bottom-right" />
  </div>
);

const IndexComponent = () => {
  const [health, setHealth] = React.useState<string>("Loading...");

  React.useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await api.health.get();
        if (response.error) {
          setHealth(`Error: ${response.error.value.message}`);
          return;
        }
        setHealth(response.data?.status ?? "Unknown");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        setHealth(`Error: ${message}`);
      }
    };

    void fetchHealth();
  }, []);

  return (
    <div>
      <p>API Health: {health}</p>
    </div>
  );
};

const rootRoute = createRootRoute({
  component: RootComponent
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexComponent
});

const routeTree = rootRoute.addChildren([indexRoute]);

export const router = createRouter({
  routeTree
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
