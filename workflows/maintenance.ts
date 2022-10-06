import { DefineWorkflow } from "deno-slack-sdk/mod.ts";
import { def as maintainDef } from "../functions/maintain.ts";
import { default as reacjilatorDef } from "./reacjilator.ts";

/**
 * https://api.slack.com/future/workflows
 */
const workflow = DefineWorkflow({
  callback_id: "reacjilator-maintenance",
  title: "Maintain the configuration of the app (beta)",
  input_parameters: {
    properties: {},
    required: [],
  },
});

workflow.addStep(maintainDef, {
  workflowCallbackId: reacjilatorDef.definition.callback_id,
});

export default workflow;
