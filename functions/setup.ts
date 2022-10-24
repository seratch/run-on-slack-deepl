import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { SlackAPI } from "deno-slack-api/mod.ts";
import { Logger } from "../utils/logger.ts";
import { FunctionSourceFile } from "../utils/function_source_file.ts";
import {
  createOrUpdateTrigger,
  findTriggerToUpdate,
  joinAllChannels,
} from "./internals/trigger_management.ts";

export const def = DefineFunction({
  callback_id: "manage-reaction-added-event-trigger",
  title: "Manage a reaction_added event trigger",
  source_file: FunctionSourceFile(import.meta.url),
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      reacjilatorWorkflowCallbackId: { type: Schema.types.string },
    },
    required: ["interactivity", "reacjilatorWorkflowCallbackId"],
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
  // ---------------------------
  // Open a modal for configuring the channel list
  // ---------------------------
  const logger = Logger(env.LOG_LEVEL);
  const client = SlackAPI(token);
  const triggerToUpdate = await findTriggerToUpdate(
    client,
    logger,
    inputs.reacjilatorWorkflowCallbackId,
  );
  logger.info(`triggerToUpdate: ${JSON.stringify(triggerToUpdate)}`);

  const channelIds = triggerToUpdate?.channel_ids != undefined
    ? triggerToUpdate.channel_ids
    : [];

  // Open the modal to configure the channel list to enable this workflow
  await client.views.open({
    interactivity_pointer: inputs.interactivity.interactivity_pointer,
    view: buildModalView(channelIds),
  });
  return {
    completed: false,
  };
})
  // ---------------------------
  // view_submission handler
  // ---------------------------
  .addViewSubmissionHandler(
    ["configure-workflow"],
    async ({ view, inputs, env, token }) => {
      const logger = Logger(env.LOG_LEVEL);
      const { reacjilatorWorkflowCallbackId } = inputs;
      const channelIds = view.state.values.block.channels.selected_channels;

      const client = SlackAPI(token);
      let modalMessage = "The configuration is done!";
      try {
        const triggerToUpdate = await findTriggerToUpdate(
          client,
          logger,
          inputs.reacjilatorWorkflowCallbackId,
        );
        // If the trigger already exists, we update it.
        // Otherwise, we create a new one.
        await createOrUpdateTrigger(
          client,
          logger,
          reacjilatorWorkflowCallbackId,
          channelIds,
          triggerToUpdate,
        );
        // This app's bot user joins all the channels
        // to perform API calls for the channels
        const error = await joinAllChannels(
          client,
          logger,
          channelIds,
        );
        if (error) {
          modalMessage = error;
        }
      } catch (e) {
        logger.error(e);
        modalMessage = e;
      }
      // nothing to return if you want to close this modal
      return buildModalUpdateResponse(modalMessage);
    },
  )
  // ---------------------------
  // view_closed handler
  // ---------------------------
  .addViewClosedHandler(
    ["configure-workflow"],
    ({ view, env }) => {
      const logger = Logger(env.LOG_LEVEL);
      logger.debug(JSON.stringify(view));
      return {
        outputs: {},
        completed: true,
      };
    },
  );

// ---------------------------
// Internal functions
// ---------------------------

function buildModalView(channelIds: string[]) {
  return {
    "type": "modal",
    "callback_id": "configure-workflow",
    "title": {
      "type": "plain_text",
      "text": "Workflow Configuration",
    },
    "notify_on_close": true,
    "submit": {
      "type": "plain_text",
      "text": "Confirm",
    },
    "blocks": [
      {
        "type": "input",
        "block_id": "block",
        "element": {
          "type": "multi_channels_select",
          "placeholder": {
            "type": "plain_text",
            "text": "Select channels to add",
          },
          "initial_channels": channelIds,
          "action_id": "channels",
        },
        "label": {
          "type": "plain_text",
          "text": "Channels to enable the workflow",
        },
      },
    ],
  };
}

function buildModalUpdateResponse(modalMessage: string) {
  return {
    response_action: "update",
    view: {
      "type": "modal",
      "callback_id": "configure-workflow",
      "notify_on_close": true,
      "title": {
        "type": "plain_text",
        "text": "Workflow Configuration",
      },
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": modalMessage,
          },
        },
      ],
    },
  };
}
