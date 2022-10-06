import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { SlackAPI } from "deno-slack-api/mod.ts";
import { Logger } from "../utils/logger.ts";
import { FunctionSourceFile } from "../utils/function_source_file.ts";

export const def = DefineFunction({
  callback_id: "maintain-channel-memberships",
  title: "Maintain channel memberships for a trigger",
  source_file: FunctionSourceFile(import.meta.url),
  input_parameters: {
    properties: {
      workflowCallbackId: { type: Schema.types.string },
    },
    required: ["workflowCallbackId"],
  },
  output_parameters: {
    properties: {},
    required: [],
  },
});

export default SlackFunction(def, async ({
  inputs,
  env,
  token,
}) => {
  const logger = Logger(env.LOG_LEVEL);
  const client = SlackAPI(token);
  // Check the existing triggers for this workflow
  const allTriggers = await client.workflows.triggers.list({});
  let targetTrigger = undefined;
  // find the trigger to maintain
  if (allTriggers.triggers) {
    for (const trigger of allTriggers.triggers) {
      if (
        trigger.workflow.callback_id === inputs.workflowCallbackId &&
        trigger.event_type === "slack#/events/reaction_added"
      ) {
        targetTrigger = trigger;
      }
    }
  }
  if (
    targetTrigger === undefined ||
    targetTrigger.channel_ids === undefined
  ) {
    return { outputs: {} };
  }
  // This app's bot user joins all the channels
  // to perform API calls for the channels
  for (const channelId of targetTrigger.channel_ids) {
    const joinResult = await client.conversations.join({
      channel: channelId,
    });
    logger.debug(joinResult);
  }
  return { outputs: {} };
});
