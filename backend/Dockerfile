FROM node:20-alpine

WORKDIR /app

# netcat for "wait for db"
RUN apk add --no-cache netcat-openbsd

COPY package*.json ./
RUN npm ci

COPY . .

# If you use prisma
RUN npx prisma generate || true

EXPOSE 4000

CMD ["sh", "-c", "sh ./docker-entrypoint.sh"]
