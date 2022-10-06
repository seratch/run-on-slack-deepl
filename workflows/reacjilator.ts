import { DefineWorkflow, Schema } from "deno-slack-sdk/mod.ts";
import { def as langSelectorDef } from "../functions/lang_selector.ts";
import { def as translatorDef } from "../functions/translator.ts";

const workflow = DefineWorkflow({
  callback_id: "reacjilator",
  title: "DeepL translation (beta)",
  description: "Translate a message when a flag reaction is added",
  input_parameters: {
    properties: {
      channelId: { type: Schema.slack.types.channel_id },
      messageTs: { type: Schema.types.string },
      reaction: { type: Schema.types.string },
    },
    required: ["channelId", "messageTs", "reaction"],
  },
});

// Enable steps
const langSelector = workflow.addStep(langSelectorDef, workflow.inputs);

workflow.addStep(translatorDef, {
  ...workflow.inputs,
  lang: langSelector.outputs.lang,
});

export default workflow;
