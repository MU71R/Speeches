const express = require("express");
const router = express.Router();
const { verifyTokenMiddleware } = require("../middleware/auth");
const { addDecision, getalldecisions, deleteDecision } = require("../controller/add-decision");
router.post("/add-decision", verifyTokenMiddleware, addDecision);
router.get("/all-decisions", verifyTokenMiddleware, getalldecisions);
router.delete("/delete-decision/:id", verifyTokenMiddleware, deleteDecision);
module.exports = router;