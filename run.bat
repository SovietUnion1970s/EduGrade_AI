@echo off
echo ======================================================
echo    KHOI DONG EDUGRADE AI (ONE-CLICK DOCKER RUN)
echo ======================================================
if not exist .env (
    echo [Info] Copying .env.example to .env...
    copy .env.example .env
)
echo [Info] Starting Docker containers...
docker compose up --build -d
echo [Success] EduGrade AI dang duoc khoi dong tai http://localhost:3000
pause
