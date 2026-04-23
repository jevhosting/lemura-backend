const ytdlp = require("yt-dlp-exec");

async function download() {
  try {
    await ytdlp("https://www.youtube.com/watch?v=3fumBcKC6RE", {
      extractAudio: true,
      audioFormat: "mp3",
      output: "audio.%(ext)s",
    });

    console.log("Descarga completa 🎧");
  } catch (error) {
    console.error("Error:", error);
  }
}

download();