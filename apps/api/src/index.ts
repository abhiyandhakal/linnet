import { Elysia } from 'elysia';

const PORT = process.env.API_PORT ? parseInt(process.env.API_PORT) : 3500;
const HOST = process.env.API_HOST || 'localhost';

const app = new Elysia()
    .get('/', () => 'Hello Elysia')
    .listen({
        port: PORT,
        hostname: HOST,
    });

export type App = typeof app;

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
