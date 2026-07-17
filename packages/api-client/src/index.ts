import { treaty } from "@elysiajs/eden";
import type { App } from "@linnet/api";

export type LinnetApiOptions = { baseUrl: string; credentials?: RequestCredentials; getHeaders?: () => HeadersInit | Promise<HeadersInit> };

export function createApi(options: LinnetApiOptions) {
  return treaty<App>(options.baseUrl, {
    fetch: { credentials: options.credentials ?? "include" },
    headers: async () => options.getHeaders ? await options.getHeaders() : {}
  });
}
