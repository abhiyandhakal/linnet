/// <reference types="vinxi/types/server" />
import { eventHandler, getRequestURL } from "vinxi/http";
import { renderToString } from "react-dom/server";
import { createMemoryHistory } from "@tanstack/react-router";
import { RouterProvider } from "@tanstack/react-router";
import { createRouter } from "./router";

export default eventHandler(async (event) => {
  const url = getRequestURL(event);
  const router = createRouter();

  const memoryHistory = createMemoryHistory({
    initialEntries: [url.pathname + url.search],
  });

  router.update({
    history: memoryHistory,
    context: {
      head: "",
      request: event.node.req,
    },
  });

  await router.load();

  const appHtml = renderToString(<RouterProvider router={router as any} />);
  const clientEntryPath = new URL("./client.tsx", import.meta.url).pathname;
  const scripts = import.meta.env.DEV
    ? `<script type="module" src="/_build/@vite/client"></script>`
    : "";

  const refreshPreamble = import.meta.env.DEV
    ? `<script type="module">import RefreshRuntime from "/_build/@react-refresh";
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;</script>`
    : "";

  const clientScript = import.meta.env.DEV
    ? `<script type="module" src="/_build/@fs${clientEntryPath}"></script>`
    : "";

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Linnet - Dashboard</title></head><body><div id="app-root">${appHtml}</div>${scripts}${refreshPreamble}${clientScript}</body></html>`;

  return new Response(html, {
    status: router.state.statusCode || 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
});
