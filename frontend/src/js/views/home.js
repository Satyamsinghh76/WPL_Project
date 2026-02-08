import { habitService } from "../services/habitService.js";
import { todoService } from "../services/todoService.js";

export function renderHome(container) {
  const habits = habitService.getAll();
  const todos = todoService.getAll();

  container.innerHTML = `
    <h2>Today</h2>

    <section>
      <h3>Habits</h3>
      ${habits.map(h => `<div class="card">${h.name}</div>`).join("")}
    </section>

    <section>
      <h3>Todos</h3>
      ${todos.map(t => `<div class="card">${t.title}</div>`).join("")}
    </section>
  `;
}
