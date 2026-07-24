const express = require("express");
const multer = require("multer");
const { GoogleGenAI } = require("@google/genai");
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

// Reads GEMINI_API_KEY (or GOOGLE_API_KEY) from the environment automatically.
const ai = new GoogleGenAI({});
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

app.use(express.static("public"));
app.use(express.json());

app.post("/api/analyze", upload.single("screenshot"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No screenshot uploaded." });
  }

  const base64Image = req.file.buffer.toString("base64");

  try {
    const interaction = await ai.interactions.create({
      model: MODEL,
      system_instruction: SYSTEM_PROMPT,
      input: [
        {
          type: "image",
          data: base64Image,
          mime_type: req.file.mimetype,
        },
        {
          type: "text",
          text: "Analyze this Quotex M1 chart screenshot and produce the signal output exactly per your instructions.",
        },
      ],
    });

    const text = interaction.output_text;
    if (!text) {
      return res.status(422).json({ error: "The model returned no analysis for this image." });
    }

    res.json({ analysis: text });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || "Analysis failed. Please try again." });
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
