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

    const formLink = `https://docs.google.com/forms/d/e/1FAIpQLSfUtLkuhVmIvvBf2BviwsX_MeBMd20XMQWLR-08OdKExpQ4sg/viewform?usp=pp_url&entry.2094785429=${channelName}&entry.580853574=${channelId}`;
    console.log(`Form link: ${formLink}`);

    // Markdown welcome message and evaluation questions string
    const messageText = `
    This channel is dedicated to the new opportunity. To ensure that our teams can best support and collaboarte with each other, please take a few moments to answer the following questions. We promise it is a short form, wont take more than 30 seconds of your time. 😊

    ⭐ <${formLink}|Link for Opp Evaluation form>
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
    // Return just the challenge value as plain text
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(body.challenge);
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