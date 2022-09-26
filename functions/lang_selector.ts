import { DefineFunction, Schema } from "deno-slack-sdk/mod.ts";
import { SlackFunctionHandler } from "deno-slack-sdk/types.ts";
import { reactionToLang } from "./languages.ts";

export const def = DefineFunction({
  callback_id: "lang_selector",
  title: "Language selector",
  description: "A funtion to identify the language to translate into",
  source_file: "functions/lang_selector.ts",
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
}) => {
  console.log(`lang_selector function called: ${JSON.stringify(inputs)}`);
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
