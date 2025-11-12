
const express=require("express");
const mongoose =require("mongoose");
const http = require("http");
const path = require("path");
const app = express();
const server = http.createServer(app);
app.use (express.json());
require('dotenv').config()
require("./cron/letterNotifications");
const cors = require("cors");
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: '10mb' }));   // <-- ضروري
app.use(express.urlencoded({ extended: true }));
app.use("/generated-files", express.static(path.join(__dirname, "generated-files")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use("/", require("./routes/login"));
app.use("/users", require("./routes/users"));
app.use("/decision", require("./routes/add-decision"));
app.use("/letters", require("./routes/letters"));
app.use("/notifications", require("./routes/notifications"));
const mongourl = process.env.MONGO_URL;
mongoose
  .connect(mongourl)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Connection Error:", err));
const { init } = require("./socket");
init(server);
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
