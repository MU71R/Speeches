const express = require("express");
const router = express.Router();
const {
  verifyTokenMiddleware,
  isAdmin,
  authorizeOwnerOrAdmin,
} = require("../middleware/auth");
const {
  addLetter,
  getallletters,
  getletterbyid,
  deletletter,
  updateletter,
  updatestatusbysupervisor,
  updatestatusbyuniversitypresident,
  getUserArchivedLetters,
  getAllArchivedLetters,
} = require("../controller/letters");

router.post("/add-letter", verifyTokenMiddleware, addLetter);
router.get("/all-letters", verifyTokenMiddleware, getallletters);
router.delete("/delete-letter/:id", verifyTokenMiddleware, deletletter);
router.get("/get-letter/:id", verifyTokenMiddleware, getletterbyid);
router.put("/update-letter/:id", verifyTokenMiddleware, updateletter);
router.put(
  "/update-status-supervisor/:id",
  verifyTokenMiddleware,
  updatestatusbysupervisor
);
router.put(
  "/update-status-university-president/:id",
  verifyTokenMiddleware,
  updatestatusbyuniversitypresident
);
router.get(
  "/get-user-archived-letters",
  verifyTokenMiddleware,
  getUserArchivedLetters
);
router.get(
  "/get-all-archived-letters",
  verifyTokenMiddleware,
  getAllArchivedLetters
);
module.exports = router;
