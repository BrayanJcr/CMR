FROM node:20-alpine

# ffmpeg para conversión webm → ogg en notas de voz
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

EXPOSE 3002

CMD ["node", "src/server.js"]
