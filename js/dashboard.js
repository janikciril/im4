(() => {
  const form = document.getElementById("roomCreateForm");
  const input = document.getElementById("newRoomName");
  const addButton = document.getElementById("addRoomBtn");
  const roomsList = document.getElementById("roomsList");
  const roomCount = document.querySelector('[data-bind="roomCount"]');
  const allRoomsChip = document.querySelector('[data-bind="allRoomsLabel"]');
  const noiseValue = document.getElementById("noiseValue");
  const co2Value = document.getElementById("co2Value");
  const alertsList = document.getElementById("alertsList");
  const notificationsList = document.getElementById("notificationsList");
  const lastUpdated = document.getElementById("lastUpdated");
  const activityChart = document.getElementById("activityChart");

  if (
    !form ||
    !input ||
    !addButton ||
    !roomsList ||
    !roomCount ||
    !allRoomsChip ||
    !noiseValue ||
    !co2Value ||
    !alertsList ||
    !notificationsList ||
    !lastUpdated ||
    !activityChart
  ) {
    return;
  }

  const roomsApiUrl = "api/rooms.php";
  const sensorApiUrl = "api/sensor_latest.php";
  const historyApiUrl = "api/sensor_history.php";
  let selectedRoomId = null;
  let chartPointsCache = [];

  const formatTime = (timestamp) => {
    if (!timestamp) {
      return "--:--";
    }
    const parsed = new Date(timestamp.replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) {
      return "--:--";
    }
    return parsed.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parseTimestamp = (timestamp) => {
    if (!timestamp) {
      return null;
    }
    const parsed = new Date(timestamp.replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const formatRelativeTime = (timestamp) => {
    const parsed = parseTimestamp(timestamp);
    if (!parsed) {
      return "Unbekannt";
    }

    const diffMs = Date.now() - parsed.getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

    if (diffMinutes < 1) {
      return "Gerade eben";
    }
    if (diffMinutes < 60) {
      return `vor ${diffMinutes} Min`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `vor ${diffHours} Std`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `vor ${diffDays} Tag${diffDays > 1 ? "en" : ""}`;
  };

  const updateRoomCount = () => {
    const roomChips = roomsList.querySelectorAll(".room-chip");
    roomCount.textContent = String(roomChips.length);
  };

  const renderAlerts = (noise, co2) => {
    const alerts = [];
    if (noise >= 60) {
      alerts.push('<li><span class="alert-dot" aria-hidden="true">!</span>Lautstärke erhöht</li>');
    }
    if (co2 >= 900) {
      alerts.push('<li><span class="alert-dot info" aria-hidden="true">!</span>CO2-Wert erhöht</li>');
    }
    if (alerts.length === 0) {
      alerts.push('<li><span class="alert-dot info" aria-hidden="true">i</span>Keine Warnungen aktuell</li>');
    }
    alertsList.innerHTML = alerts.join("");
  };

  const renderNotifications = (noise, co2, motionDetected) => {
    const items = [];
    if (co2 >= 900) {
      items.push(`
        <article class="stack-item blue">
          <div class="circle"></div>
          <div>
            <p>Luftqualität sinkt - bitte lüften</p>
            <small>Gerade aktualisiert</small>
          </div>
        </article>
      `);
    }
    if (noise >= 60) {
      items.push(`
        <article class="stack-item sand">
          <div class="circle"></div>
          <div>
            <p>Der Geräuschpegel ist erhöht</p>
            <small>Gerade aktualisiert</small>
          </div>
        </article>
      `);
    }
    if (motionDetected) {
      items.push(`
        <article class="stack-item green">
          <div class="circle"></div>
          <div>
            <p>Bewegung erkannt</p>
            <small>Gerade aktualisiert</small>
          </div>
        </article>
      `);
    }
    if (items.length === 0) {
      items.push(`
        <article class="stack-item blue">
          <div class="circle"></div>
          <div>
            <p>Keine neuen Ereignisse</p>
            <small>Stand: aktuell</small>
          </div>
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
      renderAlerts(0, 0);
      renderNotifications(0, 0, false);
      return;
    }

    const noise = Number(sensor.noise_level ?? 0);
    const co2 = Number(sensor.air_quality ?? 0);
    const motionDetected = Number(sensor.motion_detected ?? 0) === 1;

    noiseValue.textContent = Number.isFinite(noise) ? String(Math.round(noise)) : "--";
    co2Value.textContent = Number.isFinite(co2) ? String(Math.round(co2)) : "--";
    lastUpdated.textContent = `${formatRelativeTime(sensor.created_at)} (${formatTime(sensor.created_at)})`;

    renderAlerts(noise, co2);
    renderNotifications(noise, co2, motionDetected);
  };

  const buildPolyline = (values, width, height, padding, minValue, maxValue) => {
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;
    const range = maxValue - minValue || 1;

    return values
      .map((value, index) => {
        const x = padding + (innerWidth * index) / Math.max(values.length - 1, 1);
        const y = padding + innerHeight - ((value - minValue) / range) * innerHeight;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
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
    const noiseValues = points.map((point) => Number(point.noise_level ?? 0));
    const co2Values = points.map((point) => Number(point.air_quality ?? 0));
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
    const firstTime = formatTime(points[0]?.created_at);
    const middleTime = formatTime(points[Math.floor(points.length / 2)]?.created_at);
    const lastTime = formatTime(points[points.length - 1]?.created_at);

    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;
    const range = maxValue - minValue || 1;

    const buildDots = (values, series) =>
      values
        .map((value, index) => {
          const x = padding + (innerWidth * index) / Math.max(values.length - 1, 1);
          const y = padding + innerHeight - ((value - minValue) / range) * innerHeight;
          return `<circle class="chart-point chart-point-${series}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.2" data-point-index="${index}" data-series="${series}" />`;
        })
        .join("");

    const noiseDots = buildDots(noiseValues, "noise");
    const co2Dots = buildDots(co2Values, "co2");

    activityChart.classList.add("has-data");
    activityChart.innerHTML = `
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <line class="chart-axis" x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" />
        <line class="chart-axis" x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" />
        <polyline class="chart-noise" points="${noisePolyline}" />
        <polyline class="chart-co2" points="${co2Polyline}" />
        ${noiseDots}
        ${co2Dots}
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

    if (!tooltip) {
      return;
    }

    if (!pointElement) {
      tooltip.hidden = true;
      tooltip.classList.remove("is-noise", "is-co2");
      activityChart.querySelectorAll(".chart-point.is-active").forEach((dot) => {
        dot.classList.remove("is-active");
      });
      return;
    }

    const pointIndex = Number(pointElement.getAttribute("data-point-index"));
    const series = pointElement.getAttribute("data-series");
    const point = chartPointsCache[pointIndex];
    if (!point) {
      tooltip.hidden = true;
      return;
    }

    const noise = Math.round(Number(point.noise_level ?? 0));
    const co2 = Math.round(Number(point.air_quality ?? 0));
    const time = formatTime(point.created_at);
    const age = formatRelativeTime(point.created_at);

    const detail = series === "co2" ? `${co2} ppm CO₂` : `${noise} dB Lautstärke`;
    tooltip.textContent = `${time} (${age}) • ${detail}`;
    tooltip.classList.remove("is-noise", "is-co2");
    tooltip.classList.add(series === "co2" ? "is-co2" : "is-noise");
    tooltip.hidden = false;

    activityChart.querySelectorAll(".chart-point.is-active").forEach((dot) => {
      dot.classList.remove("is-active");
    });
    pointElement.classList.add("is-active");
  });

  const setActiveRoom = (chip, options = {}) => {
    const chips = roomsList.querySelectorAll(".room-chip");
    allRoomsChip.classList.remove("chip-active");
    allRoomsChip.classList.add("chip-muted");
    chips.forEach((item) => item.classList.remove("chip-active"));
    chip.classList.add("chip-active");
    selectedRoomId = Number(chip.dataset.roomId);

    if (options.scroll) {
      chip.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
    }
  };

  const setAllRoomsActive = () => {
    const chips = roomsList.querySelectorAll(".room-chip");
    chips.forEach((item) => item.classList.remove("chip-active"));
    allRoomsChip.classList.remove("chip-muted");
    allRoomsChip.classList.add("chip-active");
    selectedRoomId = null;
  };

  const createRoomChip = (room) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip room-chip";
    chip.textContent = room.name;
    chip.dataset.roomId = String(room.id);

    chip.addEventListener("click", async () => {
      setActiveRoom(chip);
      await Promise.all([loadSensorData(), loadSensorHistory()]);
    });

    return chip;
  };

  const renderRooms = (rooms) => {
    roomsList.querySelectorAll(".room-chip").forEach((chip) => chip.remove());

    if (!Array.isArray(rooms) || rooms.length === 0) {
      updateRoomCount();
      setAllRoomsActive();
      return;
    }

    rooms
      .slice()
      .reverse()
      .forEach((room) => {
        roomsList.appendChild(createRoomChip(room));
      });

    updateRoomCount();
    setActiveRoom(roomsList.querySelector(".room-chip"));
  };

  const loadRooms = async () => {
    const response = await fetch(roomsApiUrl, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("Raeume konnten nicht geladen werden.");
    }

    const result = await response.json();
    if (result.status !== "success" || !Array.isArray(result.rooms)) {
      throw new Error(result.message || "Ungueltige Antwort vom Server.");
    }

    renderRooms(result.rooms);
  };

  const createRoom = async (roomName) => {
    const response = await fetch(roomsApiUrl, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: roomName }),
    });

    const result = await response.json();
    if (!response.ok || result.status !== "success") {
      throw new Error(result.message || "Raum konnte nicht erstellt werden.");
    }
  };

  const loadSensorData = async () => {
    const query = selectedRoomId ? `?room_id=${selectedRoomId}` : "";
    const response = await fetch(`${sensorApiUrl}${query}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("Sensordaten konnten nicht geladen werden.");
    }

    const result = await response.json();
    if (result.status !== "success") {
      throw new Error(result.message || "Ungueltige Sensordaten.");
    }

    renderSensorData(result.sensor);
  };

  const loadSensorHistory = async () => {
    const query = selectedRoomId ? `?room_id=${selectedRoomId}&limit=12` : "?limit=12";
    const response = await fetch(`${historyApiUrl}${query}`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error("Verlaufsdaten konnten nicht geladen werden.");
    }

    const result = await response.json();
    if (result.status !== "success" || !Array.isArray(result.points)) {
      throw new Error(result.message || "Ungueltige Verlaufsdaten.");
    }

    renderActivityChart(result.points);
  };

  allRoomsChip.addEventListener("click", async () => {
    setAllRoomsActive();
    await Promise.all([loadSensorData(), loadSensorHistory()]);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const roomName = input.value.trim();
    if (!roomName) {
      input.focus();
      return;
    }

    const exists = Array.from(roomsList.querySelectorAll(".room-chip")).some(
      (chip) => chip.textContent.toLowerCase() === roomName.toLowerCase()
    );

    if (exists) {
      input.focus();
      input.select();
      return;
    }

    addButton.disabled = true;

    try {
      await createRoom(roomName);
      await loadRooms();
      await Promise.all([loadSensorData(), loadSensorHistory()]);
      input.value = "";
      input.focus();
    } catch (error) {
      console.error(error);
      alert(error.message || "Raum konnte nicht gespeichert werden.");
    } finally {
      addButton.disabled = false;
    }
  });

  loadRooms()
    .then(async () => {
      await Promise.all([loadSensorData(), loadSensorHistory()]);
    })
    .catch((error) => {
      console.error(error);
      updateRoomCount();
      setAllRoomsActive();
      renderSensorData(null);
      renderActivityChart([]);
    });
})();
