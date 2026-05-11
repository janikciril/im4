// index-auth.js
(async () => {
  try {
    const response = await fetch("api/protected.php", {
      credentials: "include",
    });

    if (response.status === 401) {
      window.location.replace("login.html");
      return;
    }

    if (!response.ok) {
      window.location.replace("login.html");
    }
  } catch (error) {
    console.error("Auth guard failed:", error);
    window.location.replace("login.html");
  }
})();
