import { habitService } from "../services/habitService.js";

export function renderHabits(container) {
  container.innerHTML = `
    <h2>Habits</h2>

    <input id="habit-name" placeholder="Enter habit name">
    <button id="add-habit">Add Habit</button>

    <div id="habit-list"></div>
  `;

  const list = container.querySelector("#habit-list");

  function refresh() {
    const habits = habitService.getAll();
    list.innerHTML = habits
      .map(h => `<div class="card">${h.name}</div>`)
      .join("");
  }

  refresh();

  container.querySelector("#add-habit").onclick = () => {
    const name = container.querySelector("#habit-name").value;
    if (!name) return;

    habitService.add({
      id: Date.now(),
      name,
      streak: 0
    });

    refresh();
  };
}
