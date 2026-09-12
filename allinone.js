const port = process.env.PORT || 5000;
process.env.DIGI_URL = `http://127.0.0.1:${port}`;
process.env.INCOME_URL = `http://127.0.0.1:${port}`;
process.env.DIGI_PREFIX = "/digilocker";
process.env.INCOME_PREFIX = "/income";

const main = require("./main/server");
const digilocker = require("./servers/digilocker");
const income = require("./servers/income");

// Redirect ONLY the exact no-slash paths (middleware = exact match, no loop)
main.use((req, res, next) => {
  if (req.path === "/digilocker" || req.path === "/income") return res.redirect(req.path + "/");
  next();
});

main.use("/digilocker", digilocker);
main.use("/income", income);

main.listen(port, () => console.log(`[SETU ALL-IN-ONE] http://localhost:${port} · portals: /digilocker · /income`));