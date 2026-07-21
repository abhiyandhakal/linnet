import { app } from "../apps/api/src/app";

export default {
  fetch(request: Request) {
    return app.handle(request);
  }
};
