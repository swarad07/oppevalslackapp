const { WebClient } = require("@slack/web-api");
require("dotenv").config();

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

// This is the serverless function that Vercel will execute
module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body;
  console.log("Received Slack event:", body);

  // Handle Slack's URL verification challenge
  if (body.type === "url_verification") {
    return res.status(200).json({ challenge: body.challenge });
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
    return res.status(200).json({ message: "Event received" });
  }

  return res.status(200).json({ message: "No action taken" });
};