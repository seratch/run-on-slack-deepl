import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { SlackAPI } from "deno-slack-api/mod.ts";
import { Logger } from "../utils/logger.ts";
import { FunctionSourceFile } from "../utils/function_source_file.ts";

export const def = DefineFunction({
  callback_id: "manage-reaction-added-event-trigger",
  title: "Manage a reaction_added event trigger",
  source_file: FunctionSourceFile(import.meta.url),
  input_parameters: {
    properties: {
      interactivity: { type: Schema.slack.types.interactivity },
      workflowCallbackId: { type: Schema.types.string },
    },
    required: ["interactivity", "workflowCallbackId"],
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
  let triggerToUpdate = undefined;
  // find the trigger to update
  if (allTriggers.triggers) {
    for (const trigger of allTriggers.triggers) {
      if (
        trigger.workflow.callback_id === inputs.workflowCallbackId &&
        trigger.event_type === "slack#/events/reaction_added"
      ) {
        triggerToUpdate = trigger;
      }
    }
  }
  logger.info(`triggerToUpdate: ${JSON.stringify(triggerToUpdate)}`);

  const channelIds = triggerToUpdate?.channel_ids != undefined
    ? triggerToUpdate.channel_ids
    : [];

  // Open the modal to configure the channel list to enable this workflow
  await client.views.open({
    interactivity_pointer: inputs.interactivity.interactivity_pointer,
    view: {
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
    },
  });
  return {
    completed: false,
  };
})
  .addViewSubmissionHandler(
    ["configure-workflow"],
    async ({ view, inputs, env, token }) => {
      const logger = Logger(env.LOG_LEVEL);
      const { workflowCallbackId } = inputs;
      const channelIds = view.state.values.block.channels.selected_channels;
      const triggerInputs = {
        channelId: { value: "{{data.channel_id}}" },
        messageTs: { value: "{{data.message_ts}}" },
        reaction: { value: "{{data.reaction}}" },
      };

      const client = SlackAPI(token);
      const allTriggers = await client.workflows.triggers.list({});
      let modalMessage = "The configuration is done!";
      try {
        let triggerToUpdate = undefined;
        // find the trigger to update
        if (allTriggers.triggers) {
          for (const trigger of allTriggers.triggers) {
            if (
              trigger.workflow.callback_id === workflowCallbackId &&
              trigger.event_type === "slack#/events/reaction_added"
            ) {
              triggerToUpdate = trigger;
              break;
            }
          }
        }

        if (triggerToUpdate === undefined) {
          // Create a new trigger
          const creation = await client.workflows.triggers.create({
            type: "event",
            name: "reaction_added event trigger",
            workflow: `#/workflows/${workflowCallbackId}`,
            event: {
              event_type: "slack#/events/reaction_added",
              channel_ids: channelIds,
            },
            inputs: triggerInputs,
          });
          logger.info(`A new trigger created: ${JSON.stringify(creation)}`);
        } else {
          // Update the existing trigger
          const update = await client.workflows.triggers.update({
            trigger_id: triggerToUpdate.id,
            type: "event",
            name: "reaction_added event trigger",
            workflow: `#/workflows/${workflowCallbackId}`,
            event: {
              event_type: "slack#/events/reaction_added",
              channel_ids: channelIds,
            },
            inputs: triggerInputs,
          });
          logger.info(`A new trigger updated: ${JSON.stringify(update)}`);
        }

        // This app's bot user joins all the channels
        // to perform API calls for the channels
        for (const channelId of channelIds) {
          const joinResult = await client.conversations.join({
            channel: channelId,
          });
          logger.debug(joinResult);
          if (joinResult.error) {
            modalMessage =
              `Failed to join <#${channelId}> due to ${joinResult.error}`;
          }
        }
      } catch (e) {
        logger.error(e);
        modalMessage = e;
      }
      // nothing to return if you want to close this modal
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
    },
  )
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
