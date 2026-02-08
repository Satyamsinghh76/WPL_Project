import { dataService } from "./dataService.js";

const KEY = "todos";

export const todoService = {
  getAll() {
    return dataService.load(KEY);
  },

  add(todo) {
    const todos = this.getAll();
    todos.push(todo);
    dataService.save(KEY, todos);
  }
};
