require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { YoutubeTranscript } = require("youtube-transcript");

const app = express();
app.use(express.json());
app.use(cors());

const genAi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function summarizeTranscript(transcript) {
  try {
    const prompt = `
    Create very detailed notes of the below transcript with highlighting all the important information with headings and bullet points as well, remember to keep it well formatted:\n
    ${transcript}`;

    const model = genAi.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error in summarizing transcript:", error);
    throw error;
  }
}

// Function to extract video ID from any YouTube URL format
function extractYouTubeVideoId(url) {
  try {
    // For URLs like https://youtu.be/VIDEO_ID and https://www.youtube.com/watch?v=VIDEO_ID
    const regex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    console.error("Error extracting video ID:", error);
    return null;
  }
}

async function getYouTubeTranscript(videoUrl) {
  const videoId = extractYouTubeVideoId(videoUrl);
  if (!videoId) {
    throw new Error("Invalid YouTube URL: Unable to extract video ID");
  }
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoId);
    if (!transcript || transcript.length === 0) {
      throw new Error("No transcript available for this video.");
    }
    return transcript.map((item) => item.text).join(" ");
  } catch (error) {
    console.error("Error fetching transcript:", error);
    throw new Error("Unable to fetch transcript for the provided video.");
  }
}

app.post("/api/summarize", async (req, res) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ error: "Video URL is required" });
    }

    const transcript = await getYouTubeTranscript(videoUrl);
    const summary = await summarizeTranscript(transcript);

    res.json({ summary });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
