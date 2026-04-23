FROM node:18

# instalar python, pipx y ffmpeg
RUN apt-get update && apt-get install -y python3 python3-pip pipx ffmpeg

# activar pipx
RUN pipx ensurepath

# instalar yt-dlp con pipx
RUN pipx install yt-dlp

# working directory
WORKDIR /app

# copiar dependencias
COPY package*.json ./
RUN npm install

# copiar todo
COPY . .

# puerto dinámico de Railway
ENV PORT=3000

EXPOSE 3000

# correr server
CMD ["node", "server.js"]