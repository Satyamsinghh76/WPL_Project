import { initRouter } from "./router.js";
import { renderBottomNav } from "./components/bottomNav.js";

const app = document.getElementById("app");

function initApp() {
  app.innerHTML = `
    <main id="view"></main>
    <nav id="bottom-nav"></nav>
  `;

  renderBottomNav();
  initRouter();
}

window.addEventListener("DOMContentLoaded", initApp);
