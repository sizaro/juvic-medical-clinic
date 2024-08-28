const { Router } = require("express");
const viewsDisplay = require("../controller")

const router = Router()

router.get("/", viewsDisplay.buildhompage )

module.exports = router