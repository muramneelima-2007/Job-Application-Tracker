const express = require("express");
const path = require("path");
const Application = require("../models/Application");
const User = require("../models/User");
const { ensureAuth } = require("../middleware/auth");

const router = express.Router();
const PAGES_DIR = path.join(__dirname, "..", "pages");
const STATUSES = ["All", "Applied", "Interview", "Offer", "Rejected"];

const sendPage = (filename) => (req, res) => {
  res.sendFile(path.join(PAGES_DIR, filename));
};

const toIsoDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const buildQuery = (search, status) => {
  const query = {};

  if (search && search.trim()) {
    query.$or = [
      { company: { $regex: search, $options: "i" } },
      { position: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
    ];
  }

  if (status && status !== "All") {
    query.status = status;
  }

  return query;
};

const getCounts = async (owner) => ({
  total: await Application.countDocuments({ owner }),
  applied: await Application.countDocuments({ owner, status: "Applied" }),
  interview: await Application.countDocuments({ owner, status: "Interview" }),
  offer: await Application.countDocuments({ owner, status: "Offer" }),
  rejected: await Application.countDocuments({ owner, status: "Rejected" }),
});

const monthLabel = (date) =>
  new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);

router.get("/", ensureAuth, sendPage("index.html"));
router.get("/my-applications", ensureAuth, sendPage("applications.html"));
router.get("/analytics", ensureAuth, sendPage("analytics.html"));
router.get("/calendar", ensureAuth, sendPage("calendar.html"));
router.get("/settings", ensureAuth, sendPage("settings.html"));
router.get("/applications/new", ensureAuth, sendPage("new.html"));

router.get("/applications/:id/edit", ensureAuth, async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.id,
    owner: req.session.userId,
  });
  if (!application) return res.redirect("/my-applications");

  return res.sendFile(path.join(PAGES_DIR, "edit.html"));
});

router.get("/api/dashboard", ensureAuth, async (req, res) => {
  const owner = req.session.userId;
  const counts = await getCounts(owner);

  const recentApplications = await Application.find({ owner })
    .sort({ dateApplied: -1 })
    .limit(6)
    .lean();

  const upcomingInterviews = await Application.find({
    owner,
    status: "Interview",
    dateApplied: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
    },
  })
    .sort({ dateApplied: 1 })
    .limit(5)
    .lean();

  return res.json({
    counts,
    recentApplications: recentApplications.map((app) => ({
      id: app._id.toString(),
      company: app.company,
      position: app.position,
      dateApplied: app.dateApplied,
      status: app.status,
    })),
    upcomingInterviews: upcomingInterviews.map((app) => ({
      id: app._id.toString(),
      company: app.company,
      position: app.position,
      dateApplied: app.dateApplied,
      status: app.status,
    })),
  });
});

router.get("/api/applications", ensureAuth, async (req, res) => {
  const owner = req.session.userId;
  const search = req.query.search || "";
  const status = STATUSES.includes(req.query.status) ? req.query.status : "All";

  const query = buildQuery(search, status);
  query.owner = owner;

  const applications = await Application.find(query).sort({ dateApplied: -1 }).lean();

  return res.json({
    statuses: STATUSES,
    filters: { search, status },
    applications: applications.map((app) => ({
      id: app._id.toString(),
      company: app.company,
      position: app.position,
      location: app.location,
      dateApplied: app.dateApplied,
      status: app.status,
      jobUrl: app.jobUrl,
      notes: app.notes,
    })),
  });
});

router.get("/api/analytics", ensureAuth, async (req, res) => {
  const owner = req.session.userId;
  const counts = await getCounts(owner);
  const total = counts.total;
  const successRate = total ? ((counts.offer / total) * 100).toFixed(1) : "0.0";

  const apps = await Application.find({ owner }).sort({ dateApplied: 1 }).lean();
  const now = new Date();
  const monthly = [];

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthly.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      label: monthLabel(date),
      count: 0,
    });
  }

  apps.forEach((app) => {
    const appliedDate = new Date(app.dateApplied);
    const hit = monthly.find(
      (m) => m.year === appliedDate.getFullYear() && m.month === appliedDate.getMonth()
    );
    if (hit) hit.count += 1;
  });

  const maxMonthly = Math.max(...monthly.map((m) => m.count), 1);

  return res.json({
    counts,
    successRate,
    monthly,
    maxMonthly,
  });
});

router.get("/api/calendar", ensureAuth, async (req, res) => {
  const owner = req.session.userId;
  const current = req.query.month;
  let baseDate;

  if (current && /^\d{4}-\d{2}$/.test(current)) {
    const [year, month] = current.split("-").map(Number);
    baseDate = new Date(year, month - 1, 1);
  } else {
    const now = new Date();
    baseDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);

  const monthlyApps = await Application.find({
    owner,
    dateApplied: { $gte: start, $lt: end },
  })
    .sort({ dateApplied: 1 })
    .lean();

  const byDate = {};
  monthlyApps.forEach((app) => {
    const key = toIsoDate(app.dateApplied);
    byDate[key] = byDate[key] || [];
    byDate[key].push({
      id: app._id.toString(),
      company: app.company,
      status: app.status,
    });
  });

  const days = [];
  for (let i = 0; i < firstDay; i += 1) {
    days.push({ empty: true });
  }

  const today = new Date();
  const todayKey = toIsoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  for (let d = 1; d <= daysInMonth; d += 1) {
    const key = toIsoDate(new Date(year, month, d));
    days.push({
      day: d,
      key,
      isToday: key === todayKey,
      events: byDate[key] || [],
    });
  }

  const prevDate = new Date(year, month - 1, 1);
  const nextDate = new Date(year, month + 1, 1);

  return res.json({
    monthLabel: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(baseDate),
    monthParam: `${year}-${String(month + 1).padStart(2, "0")}`,
    prevParam: `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`,
    nextParam: `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`,
    days,
  });
});

router.get("/api/settings", ensureAuth, async (req, res) => {
  const user = await User.findById(req.session.userId).lean();
  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json({
    profile: {
      name: user.name,
      email: user.email,
    },
  });
});

router.get("/api/applications/:id", ensureAuth, async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.id,
    owner: req.session.userId,
  }).lean();

  if (!application) return res.status(404).json({ error: "Application not found" });

  return res.json({
    application: {
      id: application._id.toString(),
      company: application.company,
      position: application.position,
      location: application.location,
      dateApplied: toIsoDate(application.dateApplied),
      status: application.status,
      jobUrl: application.jobUrl,
      notes: application.notes,
    },
  });
});

router.post("/settings", ensureAuth, async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    req.session.message = { type: "error", text: "Name and email are required." };
    return res.redirect("/settings");
  }

  const existing = await User.findOne({
    email: email.toLowerCase(),
    _id: { $ne: req.session.userId },
  });

  if (existing) {
    req.session.message = { type: "error", text: "Email already used by another account." };
    return res.redirect("/settings");
  }

  const updated = await User.findByIdAndUpdate(
    req.session.userId,
    {
      name: name.trim(),
      email: email.toLowerCase().trim(),
    },
    { new: true }
  );

  req.session.userName = updated.name;
  req.session.message = { type: "success", text: "Profile updated successfully." };

  return res.redirect("/settings");
});

router.post("/applications", ensureAuth, async (req, res) => {
  await Application.create({
    ...req.body,
    owner: req.session.userId,
  });
  res.redirect("/my-applications");
});

router.put("/applications/:id", ensureAuth, async (req, res) => {
  await Application.findOneAndUpdate(
    {
      _id: req.params.id,
      owner: req.session.userId,
    },
    req.body,
    {
      runValidators: true,
      new: true,
    }
  );
  res.redirect("/my-applications");
});

router.delete("/applications/:id", ensureAuth, async (req, res) => {
  await Application.findOneAndDelete({
    _id: req.params.id,
    owner: req.session.userId,
  });
  res.redirect("/my-applications");
});

module.exports = router;
