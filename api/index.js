// api/index.js

// Load dotenv only in non-production environments
if (process.env.NODE_ENV !== "production") {
  require('dotenv').config();
}

const express = require('express');
const serverless = require('serverless-http');
const { WebClient } = require('@slack/web-api');

const app = express();
app.use(express.json());

// Initialize Slack Web API client using environment variables managed by Vercel
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * GET route to check if the server is running.
 */
app.get("/", (req, res) => {
  console.log("GET / invoked");
  res.send("Slack event server is running!");
});

/**
 * POST route to handle Slack events.
 */
app.post("/slack/events", async (req, res) => {
  console.log("POST /slack/events invoked");
  try {
    const body = req.body;
    console.log("Received Slack event:", body);

    // Handle URL verification from Slack
    if (body.type === "url_verification") {
      return res.send(body.challenge);
    }

    // Process Slack event callbacks
    if (body.type === "event_callback") {
      const event = body.event;
      if (event.type === "channel_created") {
        const channel = event.channel;
        // Only process if the channel name starts with "opp" (case-insensitive)
        if (channel.name && channel.name.toLowerCase().startsWith("opp")) {
          await postEvaluationQuestions(channel.id, channel.name);
        }
      }
      return res.status(200).send("Event received");
    }

    // If no action is taken, send a default response.
    res.status(200).send("No action taken");
  } catch (error) {
    console.error("Error in /slack/events:", error);
    res.status(500).send("Internal Server Error");
  }
});

/**
 * Helper function to join a channel and post evaluation questions.
 */
async function postEvaluationQuestions(channelId, channelName) {
  try {
    // Attempt to join the channel
    await slackClient.conversations.join({ channel: channelId });
    console.log(`Joined channel: ${channelName}`);

    // Define the welcome message with Slack Markdown
    const messageText = `
This channel is dedicated to the new opportunity. To ensure that our Engineering teams can best support your efforts and guide this opportunity towards closure, please take a few moments to answer the following questions. We trust your insights are crucial in aligning our teams for success. Thank you for your collaboration and welcome aboard!

You can read more about the questions and why they are important <https://axelerant.atlassian.net/wiki/spaces/AH/pages/5108007089/Opp+Eval+Framework|here> :point_right:

:one: *What is the project scope, budget, and expected timeline?*

:two: *What is the client's technical ecosystem and preferred engagement model?*

:three: *What is the primary business driver and success criteria for this project, and why should Axelerant deliver it?*
    `;

    // Post the message to the channel
    const result = await slackClient.chat.postMessage({
      channel: channelId,
      text: "Opportunity Evaluation",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: messageText,
          },
        },
      ],
    });
    console.log("Posted evaluation questions with timestamp:", result.ts);
  } catch (error) {
    console.error("Error posting evaluation questions:", error);
  }
}

// Export the wrapped Express app for Vercel,
// using the option to not wait for an empty event loop.
module.exports = serverless(app, { callbackWaitsForEmptyEventLoop: false });
