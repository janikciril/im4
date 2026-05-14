// register.js
const registerForm = document.getElementById("registerForm");
const passwordInput = document.getElementById("password");
const passwordToggle = document.querySelector(".password-toggle");

if (passwordToggle && passwordInput) {
  passwordToggle.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    passwordToggle.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });
}

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = passwordInput.value.trim();

  try {
    const response = await fetch("api/register.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password }),
    });
    const result = await response.json();

    if (result.status === "success") {
      alert("Registration successful! You can now log in.");
      window.location.href = "login.html";
    } else {
      alert(result.message || "Registration failed.");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Something went wrong!");
  }
});
