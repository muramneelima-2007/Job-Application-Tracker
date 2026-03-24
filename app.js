const express = require("express");
const session = require("express-session");
const methodOverride = require("method-override");
const authRoutes = require("./routes/auth");
const applicationRoutes = require("./routes/applications");

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static("public"));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.get("/api/session", (req, res) => {
  const message = req.session.message || null;
  req.session.message = null;

  return res.json({
    currentUser: req.session.userId
      ? {
          id: req.session.userId,
          name: req.session.userName,
        }
      : null,
    message,
  });
});

app.use("/", authRoutes);
app.use("/", applicationRoutes);

module.exports = app;
