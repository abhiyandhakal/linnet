export default {
  async fetch(request: Request) {
    let stage = "app";
    try {
      stage = "config";
      await import("../packages/config/src/index");
      stage = "database";
      await import("../packages/db/src/index");
      stage = "authentication";
      await import("../apps/api/src/auth");
      stage = "app";
      const { app } = await import("../apps/api/src/app");
      return app.handle(request);
    } catch (error) {
      console.error("Linnet API initialization failed", error);
      return Response.json(
        { code: "INITIALIZATION_FAILED", message: "Linnet is starting up. Please retry shortly.", stage },
        { status: 503 },
      );
    }
  }
};
