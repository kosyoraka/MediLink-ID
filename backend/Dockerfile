# FROM node:20-alpine

# WORKDIR /app

# # netcat for "wait for db"
# RUN apk add --no-cache netcat-openbsd

# COPY package*.json ./
# RUN npm ci

# COPY . .

# # If you use prisma
# RUN npx prisma generate || true

# EXPOSE 4000

# CMD ["sh", "-c", "sh ./docker-entrypoint.sh"]
FROM node:20-alpine

WORKDIR /app
RUN apk add --no-cache netcat-openbsd

COPY package*.json ./
RUN npm ci

COPY . .

# Generate prisma + build TypeScript
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8080

CMD ["sh", "./docker-entrypoint.sh"]
