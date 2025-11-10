# ---- Giai đoạn 1: Build ----
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy tệp package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

# Build ứng dụng
RUN npm run build

# ---- Giai đoạn 2: Production ----
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy các tệp từ giai đoạn 'builder'
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist

# Mở cổng 3000 (hoặc cổng ứng dụng của bạn đang chạy)
EXPOSE 3000

# Lệnh chạy ứng dụng
CMD ["node", "dist/main"]