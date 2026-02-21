FROM node:20-alpine

WORKDIR /app

# Install dependencies (include dev for prisma CLI)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy app and Prisma schema
COPY . .

# Generate Prisma client (schema path is default ./prisma)
RUN npx prisma generate

EXPOSE 3004

# Push schema then start the server
CMD ["sh", "-c", "npx prisma db push && node src/index.js"]
