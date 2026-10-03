"use strict";

// Feature 1: a theme switch. Storage is optional, so private browsing still works.
const themeButton = document.querySelector("#theme-toggle");
function applyTheme(light) {
  document.body.classList.toggle("light-mode", light);
  themeButton.textContent = light ? "Dark mode" : "Light mode";
  themeButton.setAttribute("aria-pressed", String(light));
}
try {
  applyTheme(localStorage.getItem("cv-theme") === "light");
} catch {
  applyTheme(false);
}
themeButton.hidden = false;
themeButton.addEventListener("click", () => {
  const light = !document.body.classList.contains("light-mode");
  applyTheme(light);
  try {
    localStorage.setItem("cv-theme", light ? "light" : "dark");
  } catch {
    // The current page still changes theme when storage is unavailable.
  }
});

// Feature 2: collapse or expand skills without changing the original content.
const skillsButton = document.querySelector("#skills-toggle");
const skillsList = document.querySelector("#skills-list");
skillsButton.hidden = false;
skillsButton.addEventListener("click", () => {
  skillsList.hidden = !skillsList.hidden;
  skillsButton.textContent = skillsList.hidden ? "Show skills" : "Hide skills";
  skillsButton.setAttribute("aria-expanded", String(!skillsList.hidden));
});

// Feature 3: a non-blocking welcome message when the page loads.
const welcome = document.querySelector("#welcome");
welcome.hidden = false;
document.querySelector("#welcome-message").textContent =
  "Welcome to my portfolio. Explore my work, interests, and story.";
document.querySelector("#dismiss-welcome").addEventListener("click", () => {
  welcome.hidden = true;
  themeButton.focus();
});

// Feature 4: required fields, email validation, and dynamic feedback.
// This static website prepares a draft; it does not send or store messages.
const form = document.querySelector("#contact-form");
const status = document.querySelector("#form-status");
const draft = document.querySelector("#email-draft");
const fields = {
  name: document.querySelector("#contact-name"),
  email: document.querySelector("#contact-email"),
  message: document.querySelector("#contact-message"),
};
form.hidden = false;
form.noValidate = true;

function showError(key, message) {
  document.querySelector(`#${key}-error`).textContent = message;
  fields[key].setAttribute("aria-invalid", String(Boolean(message)));
}

form.addEventListener("input", (event) => {
  const key = event.target.name;
  if (Object.hasOwn(fields, key)) showError(key, "");
  // An edited form must be checked again before reusing its draft.
  draft.hidden = true;
  draft.removeAttribute("href");
  status.textContent = "";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  draft.hidden = true;
  draft.removeAttribute("href");
  const values = Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key, field.value.trim()]),
  );
  const errors = {
    name: values.name ? "" : "Please enter your name.",
    email: !values.email
      ? "Please enter your email address."
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)
        ? ""
        : "Please enter a valid email address, such as name@example.com.",
    message: values.message ? "" : "Please enter a message.",
  };
  Object.entries(errors).forEach(([key, message]) => showError(key, message));
  const firstError = Object.keys(errors).find((key) => errors[key]);
  if (firstError) {
    status.textContent = "Please correct the highlighted fields.";
    fields[firstError].focus();
    return;
  }
  const subject = encodeURIComponent(`Portfolio enquiry from ${values.name}`);
  const body = encodeURIComponent(
    `Name: ${values.name}\nEmail: ${values.email}\n\n${values.message}`,
  );
  draft.href = `mailto:elessawy@aucegypt.edu?subject=${subject}&body=${body}`;
  draft.hidden = false;
  status.textContent =
    "Your details are valid. Open the email draft below to review and send it. Nothing has been sent yet.";
});
