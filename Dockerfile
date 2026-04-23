FROM node:18

# instalar python y pip
RUN apt-get update && apt-get install -y python3 python3-pip

# instalar yt-dlp
RUN pip3 install yt-dlp

# working directory
WORKDIR /app

# copiar archivos
COPY package*.json ./
RUN npm install

COPY . .

# puerto
ENV PORT=3000

EXPOSE 3000

# correr server
CMD ["node", "server.js"]