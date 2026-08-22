FROM node:18-alpine

WORKDIR /app

# Chỉ copy package.json để tận dụng Docker cache layer
COPY package*.json ./

RUN npm install

COPY . .

# Khởi tạo Prisma Client
RUN npx prisma generate

# Biên dịch ứng dụng sang production build
RUN npm run build

EXPOSE 3000

# Chạy lệnh kiểm tra kết nối, đồng bộ schema database rồi mới start
CMD ["npm", "run", "start:prod"]
