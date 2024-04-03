import express, { query } from "express";
import cors from "cors";
import multer from "multer";
import axios from "axios";
import pool from "./db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import excel from "exceljs";

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://send-line.netlify.app",
    ],
    methods: ["POST", " GET", "DELETE", "PUT"],
    credentials: true,
  })
);
const port = process.env.PORT || 8081;
app.use(express.json());

// Register ************************************************************
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const sqlCheck = `SELECT username FROM users WHERE username = ?`;
    const [resultCheck] = await pool.query(sqlCheck, [username]);

    if (resultCheck.length > 0) {
      throw new Error("มีผู้ใช้งานนี้แล้ว");
    } else {
      const sql = `INSERT INTO users (username, password) VALUES (?, ?)`;
      await pool.query(sql, [username, hashedPassword]);
      res.status(200).json("ทำรายการสำเร็จ");
    }
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});

// Login ****************************************************************
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // ค้นหาข้อมูลผู้ใช้งานจากชื่อผู้ใช้
    const sqlSelect = `SELECT username, id, password, status FROM users WHERE username = ?`;
    const [rows] = await pool.query(sqlSelect, [username]);

    if (rows.length === 0) {
      return res.status(400).json({ message: "ชื่อผู้ใช้งานไม่ถูกต้อง" });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(400).json({ message: "รหัสผ่านไม่ถูกต้อง" });
    }

    const token = jwt.sign({ userId: user.id }, "10");

    return res.status(200).json({ token, status: user.status });
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});

// Register *************************************************************

app.post("/api/send", async (req, res) => {
  try {
    const { data_1, data_2, data_3, data_4, data_5, data_6, data_7, count } =
      req.body;

    const LINE_NOTIFY_TOKEN = "QKAyMnPM7Zkmz2xTb178S6ilrvBtuUa9LZDwv12EBtP";
    // const LINE_NOTIFY_TOKEN = "2fTD8Hfgpk64VH0pqYXsRzDzikjETmqniFu44vTt4dc";
    const message2 = `
    DO Number : ${data_1 || ""}
    รายการสินค้า : ${data_2 || ""}
    จำนวนสินค้าที่คืน : ${data_3 || 0}
    หน่วยนับ : ${count || 0}
    ปัญหาของการแจ้งคืน : ${data_4 || ""}
    Remake : ${data_5 || ""}
    ชื่อผู้แจ้ง : ${data_6 || ""}
    วันที่ส่งข้อมูล : ${data_7 || ""}
    `;

    const response = await axios.post(
      "https://notify-api.line.me/api/notify",
      {
        message: message2,
      },
      {
        headers: {
          Authorization: `Bearer ${LINE_NOTIFY_TOKEN}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (response.data.status === 200) {
      const sql = `INSERT INTO return_product  (do_number, code, qty, count, note, remake, sign, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?) `;
      const [result] = await pool.query(sql, [
        data_1 || 0,
        data_2 || 0,
        data_3 || 0,
        count || "",
        data_4 || "",
        data_5 || "",
        data_6 || "",
        data_7 || "",
      ]);

      if (result) {
        res.status(200).json({
          message: "บันทึกสำเร็จ",
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: "บันทึกข้อมูลไม่สำเร็จ !",
    });
  }
});

// Report ****************************************************************
app.post("/api/report", async (req, res) => {
  try {
    const { date_start, date_end, do_number } = req.body;
    let sqlSearch = `SELECT * FROM return_product WHERE 1  `;
    const queryParams = [];

    if (date_start && date_end && do_number) {
      sqlSearch += ` AND date = ? AND date = ? AND do_number = ?`;
      queryParams.push(date_start, date_end, do_number);
    } else if (date_start && date_end) {
      sqlSearch += ` AND date = ? AND date = ?`;
      queryParams.push(date_start, date_end);
    } else if (date_start) {
      sqlSearch += ` AND date = ?`;
      queryParams.push(date_start);
    } else if (date_end) {
      sqlSearch += ` AND date = ?`;
      queryParams.push(date_end);
    } else if (do_number) {
      sqlSearch += ` AND do_number = ?`;
      queryParams.push(do_number);
    }

    const [result] = await pool.query(sqlSearch, queryParams);

    let sumQty = 0;
    for (const item of result) {
      sumQty += item.qty;
    }

    const resData = {
      data: result,
      sum: sumQty,
    };
    res.status(200).json(resData);
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});

// Report/excel ****************************************************************
app.post("/api/report/excel", async (req, res) => {
  try {
    const { date_start, date_end, do_number } = req.body;

    let sqlSearch = `SELECT do_number, code, qty, count, note, remake, sign, date FROM return_product WHERE 1  `;
    const queryParams = [];

    if (date_start && date_end && do_number) {
      sqlSearch += ` AND date = ? AND date = ? AND do_number = ?`;
      queryParams.push(date_start, date_end, do_number);
    } else if (date_start && date_end) {
      sqlSearch += ` AND date = ? AND date = ?`;
      queryParams.push(date_start, date_end);
    } else if (date_start) {
      sqlSearch += ` AND date = ?`;
      queryParams.push(date_start);
    } else if (date_end) {
      sqlSearch += ` AND date = ?`;
      queryParams.push(date_end);
    } else if (do_number) {
      sqlSearch += ` AND do_number = ?`;
      queryParams.push(do_number);
    }
    const [result] = await pool.query(sqlSearch, queryParams);

    console.log(result);

    const workbook = new excel.Workbook();
    const workSheet = workbook.addWorksheet("Return Product");

    // Add headers
    const headers = Object.keys(result[0]);
    workSheet.addRow(headers);

    // Add data rows
    result.forEach((row) => {
      const rowData = Object.values(row);
      workSheet.addRow(rowData);
    });

    // Set content type and disposition
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=return_product.xlsx"
    );

    // Write to response stream
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});

// Products *****************************************************************
app.get("/api/product", async (req, res) => {
  try {
    const sqlSearch = `SELECT  id, do_number, code, qty, count, note, remake, sign, date FROM return_product  `;
    const [result] = await pool.query(sqlSearch);

    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});

app.get("/api/product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (id) {
      const sqlSearch = `SELECT id, do_number, code, qty, count, note, remake, sign, date FROM return_product WHERE id = ?  `;
      const [result] = await pool.query(sqlSearch, [id]);
      res.status(200).json(result);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});

app.post("/api/product", async (req, res) => {
  try {
    const {
      data_1,
      data_2,
      data_3,
      data_4,
      data_5,
      data_6,
      data_7,
      count,
      id,
    } = req.body;

    const sql = `UPDATE return_product SET do_number = ? , code = ? , qty = ? , count = ? , note = ? , remake = ? , sign = ? , date = ? WHERE id = ? `;
    const [result] = await pool.query(sql, [
      data_1 || "",
      data_2 || "",
      data_3 || 0,
      count || "",
      data_4 || "",
      data_5 || "",
      data_6 || "",
      data_7 || "",
      id,
    ]);
    if (result) {
      res.status(200).json("แก้ไขสำเร็จ");
    }
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});

app.delete("/api/product/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (id) {
      const sql = `DELETE FROM return_product WHERE id = ?`;
      await pool.query(sql, [id]);
      res.status(200).json({ message: "ทำรายการสำเร็จ" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json(error.message);
  }
});

app.listen(port, () => {
  console.log("server is 8081");
});
