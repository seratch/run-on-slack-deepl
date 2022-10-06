import { Trigger } from "deno-slack-api/types.ts";
import workflowDef from "../workflows/setup.ts";

const trigger: Trigger<typeof workflowDef.definition> = {
  type: "shortcut",
  name: "Open the configuration modal for reacjilator",
  workflow: `#/workflows/${workflowDef.definition.callback_id}`,
  inputs: {
    interactivity: { value: "{{data.interactivity}}" },
  },
};

export default trigger;
