function confirmDelete(event) {
  if (!window.confirm("Delete this application?")) {
    event.preventDefault();
    return false;
  }
  return true;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDateDisplay(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (response.redirected) {
    window.location.href = response.url;
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    window.location.href = "/login";
    return null;
  }

  return response.json();
}

function renderFlashMessage(message) {
  const flashEl = document.getElementById("flash-message");
  if (!flashEl) return;

  if (!message) {
    flashEl.innerHTML = "";
    return;
  }

  flashEl.innerHTML = `<div class="alert alert-${escapeHtml(message.type)}">${escapeHtml(message.text)}</div>`;
}

function setSidebarUser(user) {
  const userEl = document.getElementById("sidebar-user-name");
  if (!userEl) return;
  userEl.textContent = user && user.name ? user.name : "Guest";
}

function renderStatsCards(targetId, cards) {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = cards
    .map(
      (card) => `
      <div class="stat-card ${escapeHtml(card.className || "")}">
        <h3>${escapeHtml(card.label)}</h3>
        <p>${escapeHtml(card.value)}</p>
      </div>
    `
    )
    .join("");
}

async function loadDashboardPage() {
  const data = await fetchJson("/api/dashboard");
  if (!data) return;

  renderStatsCards("dashboard-stats", [
    { label: "Total", value: data.counts.total, className: "stat-total" },
    { label: "Applied", value: data.counts.applied, className: "stat-applied" },
    { label: "Interview", value: data.counts.interview, className: "stat-interview" },
    { label: "Offer", value: data.counts.offer, className: "stat-offer" },
    { label: "Rejected", value: data.counts.rejected, className: "stat-rejected" },
  ]);

  const recentEl = document.getElementById("recent-applications");
  if (recentEl) {
    if (!data.recentApplications.length) {
      recentEl.innerHTML = '<p class="empty">No applications yet. Add your first one.</p>';
    } else {
      const rows = data.recentApplications
        .map(
          (app) => `
            <tr>
              <td>${escapeHtml(app.company)}</td>
              <td>${escapeHtml(app.position)}</td>
              <td>${escapeHtml(formatDateDisplay(app.dateApplied))}</td>
              <td><span class="badge badge-${escapeHtml(app.status.toLowerCase())}">${escapeHtml(app.status)}</span></td>
            </tr>
          `
        )
        .join("");

      recentEl.innerHTML = `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Position</th>
                <th>Date Applied</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }
  }

  const upcomingEl = document.getElementById("upcoming-interviews");
  if (upcomingEl) {
    if (!data.upcomingInterviews.length) {
      upcomingEl.innerHTML = '<p class="empty">No upcoming interview dates.</p>';
    } else {
      const items = data.upcomingInterviews
        .map(
          (item) => `
            <li>
              <strong>${escapeHtml(item.company)}</strong>
              <span>${escapeHtml(item.position)}</span>
              <small>${escapeHtml(formatDateDisplay(item.dateApplied))}</small>
            </li>
          `
        )
        .join("");

      upcomingEl.innerHTML = `<ul class="timeline">${items}</ul>`;
    }
  }
}

async function loadApplicationsPage() {
  const params = new URLSearchParams(window.location.search);
  const search = params.get("search") || "";
  const status = params.get("status") || "All";
  const data = await fetchJson(
    `/api/applications?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`
  );
  if (!data) return;

  const searchInput = document.getElementById("filter-search");
  if (searchInput) searchInput.value = data.filters.search || "";

  const statusSelect = document.getElementById("filter-status");
  if (statusSelect) {
    statusSelect.innerHTML = data.statuses
      .map((item) => {
        const selected = data.filters.status === item ? "selected" : "";
        return `<option value="${escapeHtml(item)}" ${selected}>${escapeHtml(item)}</option>`;
      })
      .join("");
  }

  const contentEl = document.getElementById("applications-content");
  if (!contentEl) return;

  if (!data.applications.length) {
    contentEl.innerHTML = '<p class="empty">No applications found. Add your first one.</p>';
    return;
  }

  const rows = data.applications
    .map(
      (app) => `
      <tr>
        <td>${escapeHtml(app.company)}</td>
        <td>${escapeHtml(app.position)}</td>
        <td>${escapeHtml(app.location || "-")}</td>
        <td>${escapeHtml(formatDateDisplay(app.dateApplied))}</td>
        <td><span class="badge badge-${escapeHtml(app.status.toLowerCase())}">${escapeHtml(app.status)}</span></td>
        <td class="actions">
          <a class="btn-link" href="/applications/${escapeHtml(app.id)}/edit">Edit</a>
          <form method="POST" action="/applications/${escapeHtml(app.id)}?_method=DELETE" onsubmit="return confirmDelete(event)">
            <button class="btn-danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>
    `
    )
    .join("");

  contentEl.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Position</th>
            <th>Location</th>
            <th>Date Applied</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function loadAnalyticsPage() {
  const data = await fetchJson("/api/analytics");
  if (!data) return;

  renderStatsCards("analytics-stats", [
    { label: "Total", value: data.counts.total },
    { label: "Offer Rate", value: `${data.successRate}%` },
    { label: "Offers", value: data.counts.offer },
    { label: "Rejected", value: data.counts.rejected },
  ]);

  const barsEl = document.getElementById("analytics-bars");
  if (barsEl) {
    barsEl.innerHTML = data.monthly
      .map((item) => {
        const height = data.maxMonthly ? (item.count / data.maxMonthly) * 100 : 0;
        return `
          <div class="bar-item">
            <div class="bar-track">
              <div class="bar-fill" style="height: ${height}%"></div>
            </div>
            <span>${escapeHtml(item.label)}</span>
            <small>${escapeHtml(item.count)}</small>
          </div>
        `;
      })
      .join("");
  }

  const breakdownEl = document.getElementById("analytics-breakdown");
  if (breakdownEl) {
    breakdownEl.innerHTML = `
      <p><strong>Applied:</strong> ${escapeHtml(data.counts.applied)}</p>
      <p><strong>Interview:</strong> ${escapeHtml(data.counts.interview)}</p>
      <p><strong>Offer:</strong> ${escapeHtml(data.counts.offer)}</p>
      <p><strong>Rejected:</strong> ${escapeHtml(data.counts.rejected)}</p>
    `;
  }
}

async function loadCalendarPage() {
  const params = new URLSearchParams(window.location.search);
  const month = params.get("month") || "";
  const endpoint = month ? `/api/calendar?month=${encodeURIComponent(month)}` : "/api/calendar";
  const data = await fetchJson(endpoint);
  if (!data) return;

  const label = document.getElementById("calendar-month-label");
  if (label) label.textContent = data.monthLabel;

  const prevLink = document.getElementById("calendar-prev");
  const currentLink = document.getElementById("calendar-current");
  const nextLink = document.getElementById("calendar-next");
  if (prevLink) prevLink.href = `/calendar?month=${data.prevParam}`;
  if (currentLink) currentLink.href = `/calendar?month=${data.monthParam}`;
  if (nextLink) nextLink.href = `/calendar?month=${data.nextParam}`;

  const daysEl = document.getElementById("calendar-days");
  if (!daysEl) return;

  daysEl.innerHTML = data.days
    .map((cell) => {
      if (cell.empty) return '<div class="calendar-cell empty"></div>';

      const events = (cell.events || [])
        .slice(0, 3)
        .map(
          (event) =>
            `<div class="calendar-event badge-${escapeHtml(
              event.status.toLowerCase()
            )}">${escapeHtml(event.company)}</div>`
        )
        .join("");

      const more =
        cell.events && cell.events.length > 3
          ? `<div class="calendar-more">+${cell.events.length - 3} more</div>`
          : "";

      return `
        <div class="calendar-cell">
          <div class="calendar-day ${cell.isToday ? "today" : ""}">${escapeHtml(cell.day)}</div>
          ${events}
          ${more}
        </div>
      `;
    })
    .join("");
}

async function loadSettingsPage() {
  const data = await fetchJson("/api/settings");
  if (!data || !data.profile) return;

  const nameInput = document.getElementById("settings-name");
  const emailInput = document.getElementById("settings-email");

  if (nameInput) nameInput.value = data.profile.name || "";
  if (emailInput) emailInput.value = data.profile.email || "";
}

async function loadEditApplicationPage() {
  const match = window.location.pathname.match(/^\/applications\/([^/]+)\/edit$/);
  if (!match) {
    window.location.href = "/my-applications";
    return;
  }

  const applicationId = match[1];
  const data = await fetchJson(`/api/applications/${encodeURIComponent(applicationId)}`);
  if (!data || !data.application) {
    window.location.href = "/my-applications";
    return;
  }

  const form = document.getElementById("edit-application-form");
  if (!form) return;

  form.action = `/applications/${applicationId}?_method=PUT`;
  document.getElementById("edit-company").value = data.application.company || "";
  document.getElementById("edit-position").value = data.application.position || "";
  document.getElementById("edit-location").value = data.application.location || "";
  document.getElementById("edit-date-applied").value = data.application.dateApplied || "";
  document.getElementById("edit-status").value = data.application.status || "Applied";
  document.getElementById("edit-job-url").value = data.application.jobUrl || "";
  document.getElementById("edit-notes").value = data.application.notes || "";
}

async function initPage() {
  const page = document.body.dataset.page || "";
  const session = await fetchJson("/api/session");
  if (!session) return;

  setSidebarUser(session.currentUser);
  renderFlashMessage(session.message);

  if (page === "dashboard") await loadDashboardPage();
  if (page === "applications") await loadApplicationsPage();
  if (page === "analytics") await loadAnalyticsPage();
  if (page === "calendar") await loadCalendarPage();
  if (page === "settings") await loadSettingsPage();
  if (page === "edit-application") await loadEditApplicationPage();
}

document.addEventListener("DOMContentLoaded", initPage);
