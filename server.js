require("dotenv").config();

const express = require("express");
const cors = require("cors");
const ytdlp = require("yt-dlp-exec");
const axios = require("axios");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Lumora backend running 🚀");
});

app.post("/transcribe", async (req, res) => {
  try {
    const { url } = req.body;

    console.log("URL recibida:", url);
    console.log("Descargando audio...");

    await ytdlp(url, {
      extractAudio: true,
      audioFormat: "mp3",
      output: "audio-%(id)s.%(ext)s",
    });

    console.log("Descarga terminada");

    const audioStream = fs.createReadStream(`audio-${url.split("v=")[1]}.mp3`);

    console.log("Subiendo a Assembly...");

    const uploadRes = await axios.post(
      "https://api.assemblyai.com/v2/upload",
      audioStream,
      {
        headers: {
          authorization: process.env.ASSEMBLY_API_KEY,
          "content-type": "application/octet-stream",
        },
      },
    );

    const audioUrl = uploadRes.data.upload_url;

    console.log("Audio subido:", audioUrl);
    console.log("Solicitando transcripción...");

    const transcriptRes = await axios.post(
      "https://api.assemblyai.com/v2/transcript",
      {
        audio_url: audioUrl,
        speech_models: ["universal-2"],
      },
      {
        headers: {
          authorization: process.env.ASSEMBLY_API_KEY,
          "content-type": "application/json",
        },
      },
    );

    const transcriptId = transcriptRes.data.id;

    console.log("Transcript ID:", transcriptId);
    console.log("Esperando resultado...");

    let transcriptText = "";
    let status = "queued";

    while (status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const pollingRes = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            authorization: process.env.ASSEMBLY_API_KEY,
          },
        },
      );

      status = pollingRes.data.status;
      console.log("Estado:", status);

      if (status === "error") {
        throw new Error(pollingRes.data.error || "Transcription failed");
      }

      if (status === "completed") {
        transcriptText = pollingRes.data.text;
      }
    }

    res.json({
      transcript: transcriptText,
    });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Error en proceso" });
  }
});

const PORT = 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
