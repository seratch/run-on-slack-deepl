import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { def as setupDef } from "../functions/setup.ts";
import { default as reacjilatorDef } from "./reacjilator.ts";

/**
 * https://api.slack.com/future/workflows
 */
const workflow = DefineWorkflow({
  callback_id: "reacjilator-setup",
  title: "Configure DeepL translator app in channels (beta)",
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
    },
    required: ["interactivity"],
  },
});

workflow.addStep(setupDef, {
  interactivity: workflow.inputs.interactivity,
  workflowCallbackId: reacjilatorDef.definition.callback_id,
});

export default workflow;
