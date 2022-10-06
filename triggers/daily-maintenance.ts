import { Trigger } from "deno-slack-api/types.ts";
import workflowDef from "../workflows/maintenance.ts";

const trigger: Trigger<typeof workflowDef.definition> = {
  type: "scheduled",
  name: "Trigger a scheduled maintenance job",
  workflow: `#/workflows/${workflowDef.definition.callback_id}`,
  inputs: {},
  schedule: {
    // TODO: adjust the start time to be a future date
    start_time: "2022-10-01T00:00:00Z",
    end_time: "2037-12-31T23:59:59Z",
    frequency: { type: "daily", repeats_every: 1 },
  },
};

export default trigger;
