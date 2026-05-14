async function checkAuth() {
  try {
    const response = await fetch("/api/protected.php", {
      credentials: "include",
    });

    if (response.status === 401) {
      window.location.href = "/login.html";
      return false;
    }

    const result = await response.json();

    // Display user data in the protected content div
    document.getElementById("userEmail").textContent = result.email;
    document.getElementById("userId").textContent = result.user_id;

    return true;
  } catch (error) {
    console.error("Auth check failed:", error);
    window.location.href = "/login.html";
    return false;
  }
}

async function fetchSensorData() {
  try {
    const response = await fetch("/api/sensor_latest.php", {
      credentials: "include",
    });

    if (!response.ok) return;

    const result = await response.json();

    if (result.status === "success" && result.sensor) {
      const { noise_level, air_quality, recorded_at } = result.sensor;

      document.getElementById("noise-val").textContent =
        noise_level !== null ? noise_level : "—";
      document.getElementById("air-val").textContent =
        air_quality !== null ? air_quality : "—";
      document.getElementById("sensor-time").textContent = recorded_at
        ? new Date(recorded_at).toLocaleTimeString()
        : "—";
    }
  } catch (error) {
    console.error("Sensor fetch failed:", error);
  }
}

window.addEventListener("load", async () => {
  const authed = await checkAuth();
  if (!authed) return;
  fetchSensorData();
  setInterval(fetchSensorData, 5000);
});
