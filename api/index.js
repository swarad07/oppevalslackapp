require("dotenv").config();

// This is the serverless function for the root path
module.exports = (req, res) => {
  res.status(200).send("Slack event server is running on Vercel!");
};