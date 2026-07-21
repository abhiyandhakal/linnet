import { send } from "@vercel/queue";

export const JOB_TOPIC = "linnet-jobs";

export async function publishJob(job: { id: string; type: string }) {
  if (!process.env.VERCEL) return null;
  return send(JOB_TOPIC, { jobId: job.id, type: job.type });
}
