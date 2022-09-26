import { DefineFunction, Schema } from "deno-slack-sdk/mod.ts";
import { SlackFunctionHandler } from "deno-slack-sdk/types.ts";
import { SlackAPI } from "deno-slack-api/mod.ts";
import { SlackAPIClient } from "deno-slack-api/types.ts";

export const def = DefineFunction({
  callback_id: "translator",
  title: "Translator",
  description: "A funtion to translate a Slack message",
  source_file: "functions/translator.ts",
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

const func: SlackFunctionHandler<typeof def.definition> = async ({
  inputs,
  token,
  env,
}) => {
  console.log(`translator function called: ${JSON.stringify(inputs)}`);
  const emptyOutputs = { outputs: {} };
  if (inputs.lang === undefined) {
    // no language specified by the reaction
    console.log(`Skipped as no lang detected`);
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
    console.log(
      `Failed to fetch the message due to ${translationTarget.error}`
    );
    return emptyOutputs;
  }
  if (translationTarget.messages.length == 0) {
    console.log(`No message found`);
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
    console.log(`Translation failed for some reason: ${translationResult}`);
    return emptyOutputs;
  }
  const translatedText = translationResult.translations[0].text;
  const replies = await client.conversations.replies({
    channel: inputs.channelId,
    ts: inputs.messageTs,
  });
  if (isAlreadyPosted(replies.messages, translatedText)) {
    // Skip posting the same one
    console.log(
      `Skipped this translation as it's already posted: ${translatedText}`
    );
    return emptyOutputs;
  }
  const result = await sayInThread(
    client,
    inputs.channelId,
    inputs.messageTs,
    translatedText
  );
  return await { outputs: { ts: result.ts } };
};
export default func;

// internal functions

function isAlreadyPosted(
  // deno-lint-ignore no-explicit-any
  replies: Record<string, any>[],
  translatedText: string
): boolean {
  console.log(replies);
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
  text: string
) {
  return await client.chat.postMessage({
    channel: channelId,
    text,
    thread_ts: threadTs,
  });
}
