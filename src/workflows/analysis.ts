import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import { bindDb } from "../lib/db";
import { collectPhase, failJob, lookupPhase, scoutPhase, skimPhase, synthesizePhase, type AnalysisParams } from "../lib/jobs";

// One report, as a durable Workflow. Each step's result is persisted, so a retry after a Steam hiccup or
// a failed model call resumes from that step instead of starting over.

export class AnalysisWorkflow extends WorkflowEntrypoint<CloudflareEnv, AnalysisParams> {
  async run(event: WorkflowEvent<AnalysisParams>, step: WorkflowStep) {
    bindDb(this.env.DB);
    const params = event.payload;
    try {
      const source = await step.do("look up game", { retries: { limit: 3, delay: "5 seconds", backoff: "exponential" } }, () =>
        lookupPhase(params),
      );
      const collected = await step.do(
        "collect reviews",
        { retries: { limit: 2, delay: "30 seconds", backoff: "exponential" }, timeout: "15 minutes" },
        () => collectPhase(params, source),
      );
      const scouted = await step.do("scout the web", { retries: { limit: 1, delay: "10 seconds", backoff: "constant" }, timeout: "5 minutes" }, () =>
        scoutPhase(params, source),
      );
      const skimmed = await step.do(
        "skim reviews",
        { retries: { limit: 1, delay: "20 seconds", backoff: "constant" }, timeout: "20 minutes" },
        () => skimPhase(params, source, collected),
      );
      // One retry only: a second attempt costs another full model call.
      return await step.do(
        "synthesize",
        { retries: { limit: 1, delay: "20 seconds", backoff: "constant" }, timeout: "20 minutes" },
        () => synthesizePhase(params, source, collected, scouted, skimmed),
      );
    } catch (err) {
      await step.do("mark failed", () => failJob(params.jobId, err));
      throw err;
    }
  }
}
