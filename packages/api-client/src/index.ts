import { treaty } from "@elysiajs/eden";

export const createApiClient = <App>(baseUrl: string) => treaty<App>(baseUrl);
