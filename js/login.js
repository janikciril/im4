// login.js
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("password");
const passwordToggle = document.querySelector(".password-toggle");

if (passwordToggle && passwordInput) {
  passwordToggle.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    passwordToggle.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = passwordInput.value.trim();

  try {
    const response = await fetch("api/login.php", {
      method: "POST",
      // credentials: 'include', // uncomment if front-end & back-end are on different domains
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = await response.json();

    if (result.status === "success") {
      alert("Login successful!");
      window.location.href = "index.html";
    } else {
      alert(result.message || "Login failed.");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Something went wrong!");
  }
});
