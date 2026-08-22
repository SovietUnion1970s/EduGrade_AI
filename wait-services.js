const net = require("net");

const check = (host, port) => new Promise(res => {
  const s = new net.Socket();
  s.setTimeout(1500);
  s.connect(port, host, () => { s.end(); res(true); });
  s.on("error", () => res(false));
  s.on("timeout", () => { s.destroy(); res(false); });
});

async function main() {
  console.log("======================================================");
  console.log("   KIỂM TRA KẾT NỐI DATABASE & REDIS TRONG DOCKER");
  console.log("======================================================");
  
  const dbUrl = process.env.DATABASE_URL || "";
  const redisUrl = process.env.REDIS_URL || "";
  
  let dbHost = "postgres", dbPort = 5432;
  let redisHost = "redis", redisPort = 6379;
  
  if (dbUrl.includes("@")) {
    const hostPort = dbUrl.split("@")[1].split("/")[0];
    if (hostPort.includes(":")) {
      const parts = hostPort.split(":");
      dbHost = parts[0];
      dbPort = parseInt(parts[1] || "5432");
    } else {
      dbHost = hostPort;
    }
  }
  
  if (redisUrl.includes("://")) {
    const hostPort = redisUrl.split("://")[1];
    if (hostPort.includes(":")) {
      const parts = hostPort.split(":");
      redisHost = parts[0];
      redisPort = parseInt(parts[1] || "6379");
    } else {
      redisHost = hostPort;
    }
  }

  while (!(await check(dbHost, dbPort))) {
    console.log(`[Chờ] PostgreSQL (${dbHost}:${dbPort}) đang khởi động...`);
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log(`[OK] PostgreSQL (${dbHost}:${dbPort}) đã kết nối!`);

  while (!(await check(redisHost, redisPort))) {
    console.log(`[Chờ] Redis (${redisHost}:${redisPort}) đang khởi động...`);
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log(`[OK] Redis (${redisHost}:${redisPort}) đã kết nối!`);
  
  console.log("[Thành công] Các dịch vụ nền đã sẵn sàng.");
  process.exit(0);
}

main();
