import express from "express";
import cors from "cors";
import multer from "multer";
import axios from "axios";

const app = express();
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174" , "https://send-line.netlify.app"],
    methods: ["POST", " GET", "DELETE", "PUT"],
    credentials: true,
  })
);
const port = process.env.PORT || 8081;
app.use(express.json());

app.post("/api/send", async (req, res) => {
  try {
    const { data_1, data_2, data_3, data_4, data_5 } = req.body;

    // const LINE_NOTIFY_TOKEN = "QKAyMnPM7Zkmz2xTb178S6ilrvBtuUa9LZDwv12EBtP";
    const LINE_NOTIFY_TOKEN = "2fTD8Hfgpk64VH0pqYXsRzDzikjETmqniFu44vTt4dc";
    const message2 = `
      DO Number = ${data_1 || ""}
      รายการสินค้า = ${data_2 || ""}
      จำนวนสินค้าที่คืน = ${data_3 || 0}
      ปัญหาของการแจ้งคืน = ${data_4 || ""}
      Remake = ${data_5 || ""}
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

    res.status(200).json({
      message: "บันทึกสำเร็จ",
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: "บันทึกข้อมูลไม่สำเร็จ !",
    });
  }
});

app.listen(port, () => {
  console.log("server is 8081");
});
