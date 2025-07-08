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

/**
 * Handles app mentions in Slack.
 * If the message contains the word "link", it responds with the evaluation form link.
 * If not, it sends a generic message prompting the user to mention the bot with "link
 */
async function handleAppMention(event) {
  const channelId = event.channel;
  const channelInfo = await slackClient.conversations.info({ channel: channelId });
  const channelName = channelInfo.channel.name;
  const userId = event.user;

  // Only respond if the message contains the word "summary" (case-insensitive)
  if (event.text.toLowerCase().includes("summary")) {
    console.log(`App mentioned in channel: ${channelName} by user: ${userId}, requesting summary.`);
    const summaryMessage = await apiGetSummary(channelId);
    if (summaryMessage) {
      try {
        await slackClient.chat.postMessage({
          channel: channelId,
          text: summaryMessage,
          unfurl_links: false, // Prevent link previews
          unfurl_media: false
        });
        console.log(`Posted summary in reply to user ${userId}`);
      } catch (error) {
        console.error("Error posting summary reply:", error);
      }
    } else {
      console.log("No evaluations submitted yet.");
    }
    return;
  }

  // Share a generic message if the app is mentioned but does not contain "link"
  if (!event.text || !event.text.toLowerCase().includes("link")) {
    console.log("App mentioned, but 'link' or 'summary' not found in message. Ignoring.");
    const messageTextGeneric = `Hi <@${event.user}>, I can help you with the Opportunity Evaluation form. Do you need the link? Please mention me with the word "link" to get it. If you need a summary of evaluations, please mention me with the word "summary".`;
    try {
      await slackClient.chat.postMessage({
        channel: channelId,
        text: messageTextGeneric,
        unfurl_links: false, // Prevent link previews
        unfurl_media: false
      });
      console.log(`Posted a generic reply to user ${userId}`);
    } catch (error) {
      console.error("Error posting generic reply:", error);
    }
    return;
  }

  console.log(`App mentioned in channel: ${channelName} by user: ${userId}, requesting a link.`);

  const formLink = `https://docs.google.com/forms/d/e/1FAIpQLSfUtLkuhVmIvvBf2BviwsX_MeBMd20XMQWLR-08OdKExpQ4sg/viewform?usp=pp_url&entry.2094785429=${channelName}&entry.580853574=${channelId}`;
  const messageText = `
    Hi <@${userId}>, here's the link for the Opportunity Evaluation form:

    ⭐ <${formLink}|Opp Evaluation Form>
  `;

  try {
    await slackClient.chat.postMessage({
      channel: channelId,
      text: messageText,
      unfurl_links: false, // Prevent link previews
      unfurl_media: false
    });
    console.log(`Posted evaluation link in reply to user ${userId}`);
  } catch (error) {
    console.error("Error posting evaluation link reply:", error);
  }
}

/**
 * Gets the summary of evaluations from a webhook.
 * @param {*} channelId
 * @returns message
 */
async function apiGetSummary(channelId) {
  // Ensure the webhook URL is set in environment variables
  const webhookUrl = process.env.SUMMARY_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("WEBHOOK_URL is not set in environment variables.");
    return;
  }

  try {
    // Call the webhook to get the summary of evaluations
    console.log(`Calling webhook URL: ${webhookUrl} for channel ID: ${channelId}`);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${process.env.API_USER}:${process.env.API_PASSWORD}`).toString('base64')}`
      },
      body: JSON.stringify({ channelId: channelId })
    });

    if (!response.ok) {
      throw new Error(`Webhook call failed with status ${response.status}`);
    }

    // Parse the JSON response from the webhook
    const data = await response.json();
    console.log("Webhook response:", data);

    if (!Array.isArray(data) || data.length === 0) {
      return "No evaluations submitted yet.";
    }

    // Process the data to create a summary message
    let totalScore = 0;
    let summaryLines = data.map((entry, index) => {
      const email = entry["Email Address"];
      const team = entry["You are representing"];
      const score = parseFloat(entry["Scoring"]);
      totalScore += score;
      return `${index + 1}. ${email} - For ${team} - ${score}`;
    });

    const avgScore = (totalScore / data.length).toFixed(2);

    const message = `Here is the summary of all Opportunity Evaluations submitted so far,\n\n${summaryLines.join('\n')}\n\nThe average of all scores is ${avgScore}.`;

    return message;

  } catch (error) {
    console.error("Error calling webhook:", error);
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
    // Check for app mentions
    if (event.type === "app_mention") {
      await handleAppMention(event);
    }

    return res.status(200).json({ message: "Event received" });
  }

  return res.status(200).json({ message: "No action taken" });
};