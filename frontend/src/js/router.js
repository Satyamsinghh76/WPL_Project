import { renderHome } from "./views/home.js";
import { renderHabits } from "./views/habits.js";
import { renderTodos } from "./views/todos.js";
import { renderAnalytics } from "./views/analytics.js";

const routes = {
  "/": renderHome,
  "/habits": renderHabits,
  "/todos": renderTodos,
  "/analytics": renderAnalytics
};

export function initRouter() {
  window.addEventListener("hashchange", loadRoute);
  loadRoute();
}

function loadRoute() {
  const path = location.hash.replace("#", "") || "/";
  const view = document.getElementById("view");

  const render = routes[path] || renderHome;
  view.innerHTML = "";
  render(view);
}
