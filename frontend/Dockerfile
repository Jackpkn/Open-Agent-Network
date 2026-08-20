FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . ./

# Next.js inlines NEXT_PUBLIC_* at build time, so the browser-facing hub address
# has to be known here — not at container start.
ARG NEXT_PUBLIC_OAN_API=http://localhost:3001
ENV NEXT_PUBLIC_OAN_API=$NEXT_PUBLIC_OAN_API

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
