export const dataService = {
  load(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
  },

  save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};
