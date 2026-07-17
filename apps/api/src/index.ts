import { app } from "./app";
import { getConfig } from "@linnet/config";

const { PORT } = getConfig();
app.listen(PORT);
console.log(`Linnet API listening on http://localhost:${PORT}`);
