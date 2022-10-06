import { DefineFunction, Schema } from "deno-slack-sdk/mod.ts";
import { SlackFunctionHandler } from "deno-slack-sdk/types.ts";
import { reactionToLang } from "./languages.ts";
import { Logger } from "../utils/logger.ts";
import { FunctionSourceFile } from "../utils/function_source_file.ts";

export const def = DefineFunction({
  callback_id: "lang_selector",
  title: "Language selector",
  description: "A funtion to identify the language to translate into",
  source_file: FunctionSourceFile(import.meta.url),
  input_parameters: {
    properties: {
      reaction: {
        type: Schema.types.string,
      },
    },
    required: ["reaction"],
  },
  output_parameters: {
    properties: {
      lang: {
        type: Schema.types.string,
      },
    },
    required: [],
  },
});

const handler: SlackFunctionHandler<typeof def.definition> = async ({
  inputs,
  env,
}) => {
  const logger = Logger(env.LOG_LEVEL);
  logger.debug(`lang_selector inputs: ${JSON.stringify(inputs)}`);
  const reactionName = inputs.reaction;
  let lang = undefined;
  if (reactionName.match(/flag-/)) {
    // flag-***
    const matched = reactionName.match(/(?!flag-\b)\b\w+/);
    if (matched != null) {
      const country = matched[0];
      lang = reactionToLang[country];
    }
  } else {
    // jp, fr, etc.
    lang = reactionToLang[reactionName];
  }
  return await { outputs: { lang } };
};

export default handler;
