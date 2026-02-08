export function renderBottomNav() {
  const nav = document.getElementById("bottom-nav");

  nav.innerHTML = `
    <a href="#/">Home</a>
    <a href="#/habits">Habits</a>
    <a href="#/todos">Todos</a>
    <a href="#/analytics">Analytics</a>
  `;
}
