FROM node:20-alpine AS builder

WORKDIR /app

# better-sqlite3 is a native module and needs a toolchain to compile.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

COPY src/ ./src
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

COPY package*.json ./

# The toolchain is only needed to rebuild the native module, so drop it again
# rather than shipping a compiler in the runtime image.
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
 && npm ci --omit=dev \
 && apk del .build-deps

COPY --from=builder /app/dist ./dist

# Uploaded documents and the job database live here. Mount a volume over it.
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3001

# NODE_ENV=production means the hub refuses to start without OAN_TOKEN_SECRET.
# That is deliberate: a guessable signing key would expose every upload.
CMD ["node", "dist/src/index.js"]
