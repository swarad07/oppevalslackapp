require("dotenv").config();
const express = require("express");
const app = express();

app.use(express.json());

// A simple GET route for the root
app.get("/", (req, res) => {
  res.send("Slack event server is running on Vercel!");
});

// If you need to handle local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
}

// Export for Vercel
module.exports = app;