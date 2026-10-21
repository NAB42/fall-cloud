import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { firebaseConfig } from "./config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const loginPage = document.body.dataset.authPage === "login";

function redirectToLogin() {
  const returnTo = `${window.location.pathname}${window.location.search}`;
  window.location.replace(`/login.html?returnTo=${encodeURIComponent(returnTo)}`);
}

function updateProfile(user) {
  const name = user.displayName || user.email || "Team member";
  const initials = name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  document.querySelectorAll(".avatar").forEach(element => {
    element.textContent = initials;
    element.title = `${name} (${user.email || ""})`;
  });
  const footerDetails = document.querySelector(".sidebar-footer div");
  if (footerDetails) footerDetails.innerHTML = `<strong>${name}</strong><small>${user.email || "Signed in"}</small>`;

  const actions = document.querySelector(".topbar-actions");
  if (actions && !document.querySelector("#logout-button")) {
    const logout = document.createElement("button");
    logout.id = "logout-button";
    logout.className = "button button-ghost";
    logout.type = "button";
    logout.textContent = "Sign out";
    logout.addEventListener("click", () => signOut(auth));
    actions.append(logout);
  }
}

async function handleGoogleSignIn() {
  const button = document.querySelector("#google-login-button");
  const message = document.querySelector("#auth-message");
  if (button) button.disabled = true;
  if (message) message.textContent = "Opening Google sign-in…";
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Google sign-in failed:", error);
    if (message) message.textContent = error.code === "auth/popup-closed-by-user" ? "Sign-in was cancelled." : "We could not sign you in. Please try again.";
    if (button) button.disabled = false;
  }
}

onAuthStateChanged(auth, user => {
  if (loginPage) {
    if (user) {
      const destination = new URLSearchParams(window.location.search).get("returnTo");
      window.location.replace(destination?.startsWith("/") ? destination : "/dashboard/");
      return;
    }
    document.documentElement.classList.add("auth-ready");
    document.querySelector("#google-login-button")?.addEventListener("click", handleGoogleSignIn);
    return;
  }
  if (!user) {
    redirectToLogin();
    return;
  }
  updateProfile(user);
  document.documentElement.classList.add("auth-ready");
});
