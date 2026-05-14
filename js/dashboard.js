(() => {
  const noiseValue = document.getElementById("noiseValue");
  const co2Value = document.getElementById("co2Value");
  const alertsList = document.getElementById("alertsList");
  const notificationsList = document.getElementById("notificationsList");
  const lastUpdated = document.getElementById("lastUpdated");
  const activityChart = document.getElementById("activityChart");
  const roomNameEl = document.getElementById("roomName");

  if (!noiseValue || !co2Value || !alertsList || !notificationsList || !lastUpdated || !activityChart) {
    return;
  }

  const toDisplayDb = (raw) => Math.max(0, Number(raw));

  const sensorApiUrl = "api/sensor_latest.php";
  const historyApiUrl = "api/sensor_history.php";
  const roomsApiUrl = "api/rooms.php";
  let selectedRoomId = null;
  let chartPointsCache = [];
  let latestSensorCache = null;
  let historyCache = [];

  // Persistent alert state: noiseTooHigh and airBad stay visible until dismissed.
  // persistentAlerts: keys currently shown to the user
  // suppressedAlerts: keys dismissed while condition was still active (prevents re-add on next refresh)
  const persistentAlerts = new Set();
  const suppressedAlerts = new Set();
  let latestFlags = {};

  const PERSISTENT_KEYS = ["noiseTooHigh", "airBad"];

  const updatePersistentAlerts = (flags) => {
    for (const key of PERSISTENT_KEYS) {
      if (flags[key]) {
        if (!suppressedAlerts.has(key)) {
          persistentAlerts.add(key);
        }
      } else {
        // Condition cleared → allow re-trigger next time
        suppressedAlerts.delete(key);
      }
    }
    latestFlags = flags;
  };

  const dismissAlert = (key) => {
    persistentAlerts.delete(key);
    if (latestFlags[key]) {
      suppressedAlerts.add(key);
    }
    renderAlerts(latestFlags);
    renderNotifications(latestFlags);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "--:--";
    const parsed = new Date(timestamp.replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return "--:--";
    return parsed.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  const parseTimestamp = (timestamp) => {
    if (!timestamp) return null;
    const parsed = new Date(timestamp.replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatRelativeTime = (timestamp) => {
    const parsed = parseTimestamp(timestamp);
    if (!parsed) return "Unbekannt";
    const diffMs = Date.now() - parsed.getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMinutes < 1) return "Gerade eben";
    if (diffMinutes < 60) return `vor ${diffMinutes} Min`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `vor ${diffHours} Std`;
    const diffDays = Math.floor(diffHours / 24);
    return `vor ${diffDays} Tag${diffDays > 1 ? "en" : ""}`;
  };

  // --- Alert logic ---
  // Detects four conditions from history + latest reading:
  //   tooQuiet    : all readings in the last 15 min are >= 8 dB below the rolling average
  //   tooLoud     : all readings in the last  5 min are >= 8 dB above the rolling average
  //   airBad      : latest CO2 >= 900 ppm (ventilation recommended)
  //   noiseTooHigh: two consecutive readings in a row are both > 62 dB
  const NOISE_HIGH_THRESHOLD_DB = 62;

  const detectAlerts = (sensor, points) => {
    const latestCo2 = Number(sensor?.air_quality ?? 0);
    const airBad = latestCo2 >= 900;

    if (!Array.isArray(points) || points.length < 3) {
      return { tooQuiet: false, tooLoud: false, airBad, noiseTooHigh: false };
    }

    const now = Date.now();
    const enriched = points
      .map((p) => ({ noise: toDisplayDb(p.noise_level ?? 0), ts: parseTimestamp(p.recorded_at) }))
      .filter((p) => p.ts !== null);

    if (enriched.length < 2) return { tooQuiet: false, tooLoud: false, airBad, noiseTooHigh: false };

    const avgNoise = enriched.reduce((s, p) => s + p.noise, 0) / enriched.length;
    const OFFSET_DB = 8;

    const recent15 = enriched.filter((p) => now - p.ts.getTime() <= 15 * 60 * 1000);
    const recent5  = enriched.filter((p) => now - p.ts.getTime() <=  5 * 60 * 1000);

    const tooQuiet = recent15.length >= 2 && recent15.every((p) => p.noise < avgNoise - OFFSET_DB);
    const tooLoud  = recent5.length  >= 1 && recent5.every((p)  => p.noise > avgNoise + OFFSET_DB);

    // Check if the last two consecutive readings are both above 62 dB
    const last2 = enriched.slice(-2);
    const noiseTooHigh = last2.length === 2 && last2.every((p) => p.noise > NOISE_HIGH_THRESHOLD_DB);

    return { tooQuiet, tooLoud, airBad, noiseTooHigh };
  };

  const dismissBtn = (key) =>
    `<button class="alert-dismiss-btn" data-dismiss="${key}" aria-label="Warnung bestätigen">✓</button>`;

  const renderAlerts = ({ tooQuiet, tooLoud, airBad, noiseTooHigh }) => {
    const alerts = [];
    if (persistentAlerts.has("noiseTooHigh")) {
      alerts.push(`<li><span class="alert-dot" aria-hidden="true">!</span>Lautstärke über ${NOISE_HIGH_THRESHOLD_DB} dB – zwei Messungen in Folge!${dismissBtn("noiseTooHigh")}</li>`);
    }
    if (tooLoud) {
      alerts.push('<li><span class="alert-dot" aria-hidden="true">!</span>Lautstärke seit 5 Min. über Durchschnitt</li>');
    }
    if (tooQuiet) {
      alerts.push('<li><span class="alert-dot" aria-hidden="true">!</span>Ungewöhnlich still seit 15 Min.</li>');
    }
    if (persistentAlerts.has("airBad")) {
      alerts.push(`<li><span class="alert-dot info" aria-hidden="true">!</span>Luftqualität schlecht – Lüften empfohlen${dismissBtn("airBad")}</li>`);
    }
    if (alerts.length === 0) {
      alerts.push('<li><span class="alert-dot info" aria-hidden="true">i</span>Keine Warnungen aktuell</li>');
    }
    alertsList.innerHTML = alerts.join("");
  };

  const renderNotifications = ({ tooQuiet, tooLoud, airBad, noiseTooHigh }) => {
    const items = [];
    if (persistentAlerts.has("noiseTooHigh")) {
      items.push(`
        <article class="stack-item sand">
          <div class="circle"></div>
          <div><p>Lautstärke über ${NOISE_HIGH_THRESHOLD_DB} dB – sofortige Aufmerksamkeit nötig</p><small>Gerade aktualisiert</small></div>
          <button class="notif-dismiss-btn" data-dismiss="noiseTooHigh" aria-label="Bestätigen">✓</button>
        </article>
      `);
    }
    if (persistentAlerts.has("airBad")) {
      items.push(`
        <article class="stack-item blue">
          <div class="circle"></div>
          <div><p>Luftqualität sinkt – bitte lüften</p><small>Gerade aktualisiert</small></div>
          <button class="notif-dismiss-btn" data-dismiss="airBad" aria-label="Bestätigen">✓</button>
        </article>
      `);
    }
    if (tooLoud) {
      items.push(`
        <article class="stack-item sand">
          <div class="circle"></div>
          <div><p>Geräuschpegel seit 5 Min. erhöht</p><small>Gerade aktualisiert</small></div>
        </article>
      `);
    }
    if (tooQuiet) {
      items.push(`
        <article class="stack-item green">
          <div class="circle"></div>
          <div><p>Ungewöhnlich ruhig seit 15 Min.</p><small>Gerade aktualisiert</small></div>
        </article>
      `);
    }
    if (items.length === 0) {
      items.push(`
        <article class="stack-item blue">
          <div class="circle"></div>
          <div><p>Keine neuen Ereignisse</p><small>Stand: aktuell</small></div>
        </article>
      `);
    }
    notificationsList.innerHTML = items.join("");
  };

  const renderSensorData = (sensor) => {
    if (!sensor) {
      noiseValue.textContent = "--";
      co2Value.textContent = "--";
      lastUpdated.textContent = "Keine Sensordaten";
      return;
    }
    const noise = toDisplayDb(sensor.noise_level ?? 0);
    const co2 = Number(sensor.air_quality ?? 0);
    noiseValue.textContent = Number.isFinite(noise) ? String(Math.round(noise)) : "--";
    co2Value.textContent = Number.isFinite(co2) ? String(Math.round(co2)) : "--";
    lastUpdated.textContent = `${formatRelativeTime(sensor.recorded_at)} (${formatTime(sensor.recorded_at)})`;
  };

  const buildPolyline = (values, width, height, padding, minValue, maxValue) => {
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;
    const range = maxValue - minValue || 1;
    return values.map((value, index) => {
      const x = padding + (innerWidth * index) / Math.max(values.length - 1, 1);
      const y = padding + innerHeight - ((value - minValue) / range) * innerHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  };

  const renderActivityChart = (points) => {
    chartPointsCache = Array.isArray(points) ? points : [];
    if (!Array.isArray(points) || points.length < 2) {
      activityChart.classList.remove("has-data");
      activityChart.innerHTML = `
        <div class="line noise-line"></div>
        <div class="line co2-line"></div>
        <div class="chart-empty">Noch nicht genug Messwerte vorhanden</div>
      `;
      return;
    }
    const width = 360;
    const height = 190;
    const padding = 18;
    const noiseValues = points.map((p) => toDisplayDb(p.noise_level ?? 0));
    const co2Values = points.map((p) => Number(p.air_quality ?? 0));
    const merged = [...noiseValues, ...co2Values].filter(Number.isFinite);
    if (merged.length === 0) {
      activityChart.classList.remove("has-data");
      activityChart.innerHTML = '<div class="chart-empty">Keine gültigen Messwerte</div>';
      return;
    }
    const minValue = Math.min(...merged);
    const maxValue = Math.max(...merged);
    const noisePolyline = buildPolyline(noiseValues, width, height, padding, minValue, maxValue);
    const co2Polyline = buildPolyline(co2Values, width, height, padding, minValue, maxValue);
    const firstTime = formatTime(points[0]?.recorded_at);
    const middleTime = formatTime(points[Math.floor(points.length / 2)]?.recorded_at);
    const lastTime = formatTime(points[points.length - 1]?.recorded_at);
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;
    const range = maxValue - minValue || 1;
    const buildDots = (values, series) =>
      values.map((value, index) => {
        const x = padding + (innerWidth * index) / Math.max(values.length - 1, 1);
        const y = padding + innerHeight - ((value - minValue) / range) * innerHeight;
        return `<circle class="chart-point chart-point-${series}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.2" data-point-index="${index}" data-series="${series}" />`;
      }).join("");
    activityChart.classList.add("has-data");
    activityChart.innerHTML = `
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <line class="chart-axis" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
        <line class="chart-axis" x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
        <polyline class="chart-noise" points="${noisePolyline}" />
        <polyline class="chart-co2" points="${co2Polyline}" />
        ${buildDots(noiseValues, "noise")}
        ${buildDots(co2Values, "co2")}
        <text class="chart-label" x="${padding}" y="${height - 4}" text-anchor="start">${firstTime}</text>
        <text class="chart-label" x="${width / 2}" y="${height - 4}" text-anchor="middle">${middleTime}</text>
        <text class="chart-label" x="${width - padding}" y="${height - 4}" text-anchor="end">${lastTime}</text>
      </svg>
      <div class="chart-tooltip" id="chartTooltip" hidden></div>
    `;
  };

  activityChart.addEventListener("click", (event) => {
    const pointElement = event.target.closest("[data-point-index]");
    const tooltip = activityChart.querySelector("#chartTooltip");
    if (!tooltip) return;
    if (!pointElement) {
      tooltip.hidden = true;
      tooltip.classList.remove("is-noise", "is-co2");
      activityChart.querySelectorAll(".chart-point.is-active").forEach((dot) => dot.classList.remove("is-active"));
      return;
    }
    const pointIndex = Number(pointElement.getAttribute("data-point-index"));
    const series = pointElement.getAttribute("data-series");
    const point = chartPointsCache[pointIndex];
    if (!point) { tooltip.hidden = true; return; }
    const noise = Math.round(toDisplayDb(point.noise_level ?? 0));
    const co2 = Math.round(Number(point.air_quality ?? 0));
    const time = formatTime(point.recorded_at);
    const age = formatRelativeTime(point.recorded_at);
    const detail = series === "co2" ? `${co2} ppm CO₂` : `${noise} dB Lautstärke`;
    tooltip.textContent = `${time} (${age}) • ${detail}`;
    tooltip.classList.remove("is-noise", "is-co2");
    tooltip.classList.add(series === "co2" ? "is-co2" : "is-noise");
    tooltip.hidden = false;
    activityChart.querySelectorAll(".chart-point.is-active").forEach((dot) => dot.classList.remove("is-active"));
    pointElement.classList.add("is-active");
  });

  const loadSensorData = async () => {
    const query = selectedRoomId ? `?room_id=${selectedRoomId}` : "";
    const response = await fetch(`${sensorApiUrl}${query}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Sensordaten konnten nicht geladen werden.");
    const result = await response.json();
    if (result.status !== "success") throw new Error(result.message || "Ungueltige Sensordaten.");
    latestSensorCache = result.sensor;
    renderSensorData(result.sensor);
  };

  const loadSensorHistory = async () => {
    // Fetch 30 points: enough to cover 15+ minutes for alert detection
    const query = selectedRoomId ? `?room_id=${selectedRoomId}&limit=30` : "?limit=30";
    const response = await fetch(`${historyApiUrl}${query}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Verlaufsdaten konnten nicht geladen werden.");
    const result = await response.json();
    if (result.status !== "success" || !Array.isArray(result.points)) {
      throw new Error(result.message || "Ungueltige Verlaufsdaten.");
    }
    historyCache = result.points;
    renderActivityChart(result.points);
  };

  // Dismiss via click on alert list or notifications list
  alertsList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-dismiss]");
    if (btn) dismissAlert(btn.dataset.dismiss);
  });

  notificationsList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-dismiss]");
    if (btn) dismissAlert(btn.dataset.dismiss);
  });

  const refresh = async () => {
    await Promise.allSettled([
      loadSensorData().catch(console.error),
      loadSensorHistory().catch(console.error),
    ]);
    const flags = detectAlerts(latestSensorCache, historyCache);
    updatePersistentAlerts(flags);
    renderAlerts(flags);
    renderNotifications(flags);
  };

  // Init: fetch the user's single room, then start live data
  fetch(roomsApiUrl, { credentials: "include" })
    .then((r) => r.json())
    .then((result) => {
      if (result.status === "success" && result.rooms.length > 0) {
        selectedRoomId = result.rooms[0].id;
        if (roomNameEl) roomNameEl.textContent = result.rooms[0].name;
      }
      refresh();
      setInterval(refresh, 10000);
    })
    .catch((err) => {
      console.error(err);
      renderSensorData(null);
      renderActivityChart([]);
    });
})();
