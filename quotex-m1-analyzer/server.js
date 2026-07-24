const express = require("express");
const multer = require("multer");
const Anthropic = require("@anthropic-ai/sdk");
const { SYSTEM_PROMPT } = require("./systemPrompt");

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
  storage: multer.memoryStorage(),
  // Kept under Vercel's ~4.5MB serverless function request body limit.
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only PNG, JPEG, or WEBP screenshots are supported."));
    }
    cb(null, true);
  },
});

const client = new Anthropic();

app.use(express.static("public"));
app.use(express.json());

app.post("/api/analyze", upload.single("screenshot"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No screenshot uploaded." });
  }

  const base64Image = req.file.buffer.toString("base64");

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: req.file.mimetype,
                data: base64Image,
              },
            },
            {
              type: "text",
              text: "Analyze this Quotex M1 chart screenshot and produce the signal output exactly per your instructions.",
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (response.stop_reason === "refusal" || !textBlock) {
      return res.status(422).json({ error: "The model declined to analyze this image." });
    }

    res.json({ analysis: textBlock.text });
  } catch (err) {
    console.error(err);
    if (err instanceof Anthropic.APIError) {
      return res.status(err.status || 500).json({ error: err.message });
    }
    res.status(500).json({ error: "Analysis failed. Please try again." });
  }
});

// Only bind a port for local/Render-style runtimes. On Vercel the app is
// imported as a serverless function handler instead of run directly.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Quotex M1 Analyzer running at http://localhost:${PORT}`);
  });
}

module.exports = app;
