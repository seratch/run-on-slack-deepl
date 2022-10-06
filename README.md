# run-on-slack-deepl

This sample app is a translator app that runs
[DeepL's awesome APIs](https://www.deepl.com/en/docs-api) for translating Slack
message text into a different language.

## Steps to enable this app

### 0. Enable the next-gen platform in your workspace

To use this sample, you first need to install and configure the Slack CLI.
Step-by-step instructions can be found in
[Quickstart Guide](https://api.slack.com/future/quickstart). Also, the beta
platform needs to be enabled for your paid Slack workspace.

And then, you can use this GitHub repository as the template for your app.

```bash
slack create my-deepl-slack-app -t seratch/run-on-slack-deepl
cd my-deepl-slack-app/
```

### 1. Enable Setup Workflow

First off, let's enable the "setup" workflow!

```bash
slack deploy
slack trigger create --trigger-def triggers/setup.ts
```

You will get a URL (e.g., `https://slack.com/shortcuts/Ft***/****`) to invoke the setup workflow. Once you can share the URL in your Slack workspace, any users in the workspace can enable the translator app in any public channels.

### 2. Set DeepL API key to the app

Add your DeepL API key to the app env variables:

```bash
slack env add DEEPL_AUTH_KEY <your own key here>
```

### 3. Add the app to the channels

Add the deployed app to the channels you've listed in the step 1.

### 4. Add a reaction to a message in the channel

Add `:jp:` reaction to any message in the channel. If everything is fine, you
will see the same content that is translated into Japanese in its thread.

<img width="300" src="https://user-images.githubusercontent.com/19658/192277306-b3a2f431-1b8b-44e0-9b6a-224ca09a4b6e.png">

## LICENSE

The MIT License
