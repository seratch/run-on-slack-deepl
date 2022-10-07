import { DefineFunction, Schema, SlackFunction } from "deno-slack-sdk/mod.ts";
import { SlackAPI } from "deno-slack-api/mod.ts";
import { SlackAPIClient } from "deno-slack-api/types.ts";
import { Logger } from "../utils/logger.ts";
import { FunctionSourceFile } from "../utils/function_source_file.ts";

export const def = DefineFunction({
  callback_id: "translator",
  title: "Translator",
  description: "A funtion to translate a Slack message",
  source_file: FunctionSourceFile(import.meta.url),
  input_parameters: {
    properties: {
      channelId: {
        type: Schema.types.string,
      },
      messageTs: {
        type: Schema.types.string,
      },
      lang: {
        type: Schema.types.string,
      },
    },
    required: ["channelId", "messageTs"],
  },
  output_parameters: {
    properties: {
      ts: {
        type: Schema.types.string,
      },
    },
    required: [],
  },
});

export default SlackFunction(def, async ({
  inputs,
  token,
  env,
}) => {
  const logger = Logger(env.LOG_LEVEL);
  logger.debug(`translator inputs: ${JSON.stringify(inputs)}`);
  const emptyOutputs = { outputs: {} };
  if (inputs.lang === undefined) {
    // no language specified by the reaction
    logger.info(`Skipped as no lang detected`);
    return emptyOutputs;
  }
  const client: SlackAPIClient = SlackAPI(token);
  const translationTarget = await client.conversations.history({
    channel: inputs.channelId,
    oldest: inputs.messageTs,
    limit: 1,
    inclusive: true,
  });
  if (translationTarget.error) {
    // If you see this log message, you need to invite this app to the channel
    logger.info(
      `Failed to fetch the message due to ${translationTarget.error}`,
    );
    return emptyOutputs;
  }
  if (translationTarget.messages.length == 0) {
    logger.info("No message found");
    return emptyOutputs;
  }
  const authKey = env.DEEPL_AUTH_KEY;
  const apiSubdomain = authKey.endsWith(":fx") ? "api-free" : "api";
  const url = `https://${apiSubdomain}.deepl.com/v2/translate`;
  const body = new URLSearchParams();
  body.append("auth_key", authKey);
  body.append("text", translationTarget.messages[0].text);
  body.append("target_lang", inputs.lang.toUpperCase());
  const deeplResponse = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body,
  });
  const translationResult = await deeplResponse.json();
  if (!translationResult || translationResult.translations.length === 0) {
    logger.info(
      `Translation failed for some reason: ${
        JSON.stringify(translationResult)
      }`,
    );
    return emptyOutputs;
  }
  const translatedText = translationResult.translations[0].text;
  const replies = await client.conversations.replies({
    channel: inputs.channelId,
    ts: inputs.messageTs,
  });
  if (isAlreadyPosted(replies.messages, translatedText)) {
    // Skip posting the same one
    logger.info(
      `Skipped this translation as it's already posted: ${
        JSON.stringify(translatedText)
      }`,
    );
    return emptyOutputs;
  }
  const result = await sayInThread(
    client,
    inputs.channelId,
    inputs.messageTs,
    translatedText,
  );
  return await { outputs: { ts: result.ts } };
});

// ---------------------------
// Internal functions
// ---------------------------

function isAlreadyPosted(
  // deno-lint-ignore no-explicit-any
  replies: Record<string, any>[],
  translatedText: string,
): boolean {
  if (!replies) {
    return false;
  }
  for (const messageInThread of replies) {
    if (messageInThread.text && messageInThread.text === translatedText) {
      return true;
    }
  }
  return false;
}

async function sayInThread(
  client: SlackAPIClient,
  channelId: string,
  threadTs: string,
  text: string,
) {
  return await client.chat.postMessage({
    channel: channelId,
    text,
    thread_ts: threadTs,
  });
}
