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

// Check auth when page loads
window.addEventListener("load", checkAuth);
