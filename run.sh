#!/bin/sh
echo "======================================================"
echo "   KHỞI ĐỘNG EDUGRADE AI (ONE-CLICK DOCKER RUN)"
echo "======================================================"
if [ ! -f .env ]; then
    echo "[Info] Copying .env.example to .env..."
    cp .env.example .env
fi
echo "[Info] Starting Docker containers..."
docker compose up --build -d
echo "[Success] EduGrade AI đang được khởi động tại http://localhost:3000"
