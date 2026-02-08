import { todoService } from "../services/todoService.js";

export function renderTodos(container) {
  container.innerHTML = `
    <h2>Todos</h2>

    <input id="todo-title" placeholder="Enter task">
    <button id="add-todo">Add Todo</button>

    <div id="todo-list"></div>
  `;

  const list = container.querySelector("#todo-list");

  function refresh() {
    const todos = todoService.getAll();
    list.innerHTML = todos
      .map(t => `<div class="card">${t.title}</div>`)
      .join("");
  }

  refresh();

  container.querySelector("#add-todo").onclick = () => {
    const title = container.querySelector("#todo-title").value;
    if (!title) return;

    todoService.add({
      id: Date.now(),
      title,
      done: false
    });

    refresh();
  };
}
