# ---- Build stage ----
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

# ---- Runtime stage ----
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app ./

EXPOSE 5000

CMD ["node", "server.js"]