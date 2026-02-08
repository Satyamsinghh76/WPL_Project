import { dataService } from "./dataService.js";

const KEY = "habits";

export const habitService = {
  getAll() {
    return dataService.load(KEY);
  },

  add(habit) {
    const habits = this.getAll();
    habits.push(habit);
    dataService.save(KEY, habits);
  }
};
