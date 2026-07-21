import { handleCallback } from "@vercel/queue";
import { processJob, type LinnetJobMessage } from "../apps/api/src/job-processor";

const handle = handleCallback<LinnetJobMessage>(async (message) => processJob(message));

export default { fetch: handle };
