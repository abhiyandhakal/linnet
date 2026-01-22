/// <reference types="vinxi/types/client" />
import { hydrateRoot } from "react-dom/client";
import { createBrowserHistory, RouterProvider } from "@tanstack/react-router";
import { createRouter } from "./router";

const router = createRouter();
router.update({
  history: createBrowserHistory(),
  context: {
    head: "",
  },
});

const root = document.getElementById("app-root");
if (root) {
  hydrateRoot(root, <RouterProvider router={router as any} />);
  router.load();
}

export default function Client() {
  return null;
}
