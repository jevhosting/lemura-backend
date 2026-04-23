require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const { exec } = require("child_process");
const path = require("path");

const app = express();

app.use(cors({
  origin: "*"
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Lumora backend running 🚀");
});

app.post("/transcribe", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "No URL provided" });
    }

    const videoId = new URL(url).searchParams.get("v");
    const fileName = `audio-${videoId}.mp3`;
    const filePath = path.join(__dirname, fileName);

    console.log("URL:", url);
    console.log("Descargando audio con yt-dlp...");

    // 🔥 ejecutar yt-dlp desde el sistema
    await new Promise((resolve, reject) => {
      exec(
        `yt-dlp -x --audio-format mp3 -o "${fileName}" "${url}"`,
        (error, stdout, stderr) => {
          if (error) {
            console.error(stderr);
            return reject(error);
          }
          resolve();
        }
      );
    });

    console.log("Descarga terminada");

    const audioStream = fs.createReadStream(filePath);

    console.log("Subiendo a Assembly...");

    const uploadRes = await axios.post(
      "https://api.assemblyai.com/v2/upload",
      audioStream,
      {
        headers: {
          authorization: process.env.ASSEMBLY_API_KEY,
          "content-type": "application/octet-stream",
        },
      }
    );

    const audioUrl = uploadRes.data.upload_url;

    console.log("Audio subido:", audioUrl);

    const transcriptRes = await axios.post(
      "https://api.assemblyai.com/v2/transcript",
      {
        audio_url: audioUrl,
        speech_models: ["universal-2"],
      },
      {
        headers: {
          authorization: process.env.ASSEMBLY_API_KEY,
        },
      }
    );

    const transcriptId = transcriptRes.data.id;

    console.log("Esperando transcripción...");

    let status = "queued";
    let transcriptText = "";

    while (status !== "completed") {
      await new Promise((r) => setTimeout(r, 3000));

      const polling = await axios.get(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        {
          headers: {
            authorization: process.env.ASSEMBLY_API_KEY,
          },
        }
      );

      status = polling.data.status;
      console.log("Estado:", status);

      if (status === "error") {
        throw new Error(polling.data.error);
      }

      if (status === "completed") {
        transcriptText = polling.data.text;
      }
    }

    // 🔥 opcional: borrar archivo después
    fs.unlinkSync(filePath);

    res.json({ transcript: transcriptText });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Error en proceso" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});