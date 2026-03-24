const ensureAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  return next();
};

const ensureGuest = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect("/");
  }
  return next();
};

module.exports = {
  ensureAuth,
  ensureGuest,
};
