export default {
  async fetch(request: Request) {
    try {
      const { app } = await import("../apps/api/src/app");
      return app.handle(request);
    } catch (error) {
      console.error("Linnet API initialization failed", error);
      const problem = error instanceof Error ? error.name : "UnknownError";
      return Response.json(
        { code: "INITIALIZATION_FAILED", message: "Linnet is starting up. Please retry shortly.", problem },
        { status: 503 },
      );
    }
  }
};
