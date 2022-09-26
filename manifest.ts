import { Manifest } from "deno-slack-sdk/mod.ts";
import reacjilator from "./workflows/reacjilator.ts";

export default Manifest({
  name: "DeepL for Slack",
  description: "A beta app that enbales using DeepL for Slack messages",
  icon: "assets/icon.png",
  workflows: [reacjilator],
  outgoingDomains: ["api-free.deepl.com", "api.deepl.com"],
  botScopes: [
    "commands",
    "chat:write",
    "channels:history",
    "reactions:read",
  ],
});
