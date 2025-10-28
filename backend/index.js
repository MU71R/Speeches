
const express=require("express");
const mongoose =require("mongoose");
const http = require("http");
const app = express();
const server = http.createServer(app);
app.use (express.json());
require('dotenv').config()
const cors = require("cors");
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

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
