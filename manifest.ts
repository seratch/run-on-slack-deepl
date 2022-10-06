import { Manifest } from "deno-slack-sdk/mod.ts";
import reacjilator from "./workflows/reacjilator.ts";
import setup from "./workflows/setup.ts";

export default Manifest({
  name: "DeepL for Slack (beta)",
  description: "A beta app that enbales using DeepL for Slack messages",
  icon: "assets/icon.png",
  workflows: [
    reacjilator,
    setup,
  ],
  outgoingDomains: [
    "api-free.deepl.com",
    "api.deepl.com",
  ],
  botScopes: [
    // reacjilator
    "commands",
    "chat:write",
    "channels:history",
    "reactions:read",
    // setup
    "triggers:read",
    "triggers:write",
    "channels:join",
  ],
});
