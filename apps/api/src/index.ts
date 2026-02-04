import { app } from "./app";

const port = Number(process.env.API_PORT ?? 3500);
const hostname = process.env.API_HOST ?? "localhost";

app.listen({ port, hostname });

console.log(`API running at http://${hostname}:${port}`);
