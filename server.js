const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
const app = require("./app");

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
});
