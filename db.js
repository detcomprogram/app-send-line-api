import mysql from "mysql2/promise";


  const pool  =  mysql.createPool ({
    host: "147.50.231.19",
    user: "devsriwa_app_send_line",
    password: "app_send_line",
    database: "devsriwa_app_send_line",
  });

  console.log("เชื่อมต่อกับ MySQL สำเร็จแล้ว");

export default pool;
