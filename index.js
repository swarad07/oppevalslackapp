require("dotenv").config();
const express = require("express");
const { WebClient } = require("@slack/web-api");

const app = express();
app.use(express.json());

// Initialize Slack Web API client with your bot token
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Helper function to join a channel and post evaluation questions.
 */
async function postEvaluationQuestions(channelId, channelName) {
  try {
    // Attempt to join the channel
    await slackClient.conversations.join({ channel: channelId });
    console.log(`Joined channel: ${channelName}`);

    // Markdown welcome message and evaluation questions string
    const messageText = `
    This channel is dedicated to the new opportunity. To ensure that our Engineering teams can best support your efforts and guide this opportunity towards closure, please take a few moments to answer the following questions. We trust & appreciate your insights and they are crucial in aligning our teams for success. Thank you for your collaboration and welcome aboard!

  You can read more about the questions and why they are important :point_right: <https://axelerant.atlassian.net/wiki/spaces/AH/pages/5108007089/Opp+Eval+Framework|here>.

  :one: *Is this opportunity aligned with our expertise and strategic goals for the Digital BU? (Yes, no). If yes, explain how?*

  :two: *What is the client's technical ecosystem and preferred engagement model?*

  :three: *What are the top 3 value drivers for Axelerant to pursue this project?*
    `;

    // Now post the evaluation questions
    const result = await slackClient.chat.postMessage({
      channel: channelId,
      text: "Opportunity Evaluation Questions",
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

/**
 * Endpoint to handle Slack events.
 * This endpoint:
 *  - Responds to the URL verification challenge.
 *  - Listens for 'channel_created' events and posts evaluation questions for channels starting with "opp".
 */
app.post("/slack/events", async (req, res) => {
  const body = req.body;
  console.log("Received Slack event:", body);

  // Handle Slack's URL verification challenge
  if (body.type === "url_verification") {
    return res.send(body.challenge);
  }

  // Process event callbacks
  if (body.type === "event_callback") {
    const event = body.event;
    // Check if a channel was created
    if (event.type === "channel_created") {
      const channel = event.channel;
      // Only act if the channel name starts with "opp" (case insensitive)
      if (channel.name && channel.name.toLowerCase().startsWith("opp")) {
        await postEvaluationQuestions(channel.id, channel.name);
      }
    }
    return res.status(200).send("Event received");
  }

  res.status(200).send("No action taken");
});

// A simple GET route to confirm the server is running
app.get("/", (req, res) => {
  res.send("Slack event server is running!");
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
