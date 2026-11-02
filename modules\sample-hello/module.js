(() => {
  const input = document.getElementById('demoName');
  const result = document.getElementById('demoResult');
  document.getElementById('demoButton').addEventListener('click', () => {
    const name = input.value.trim().slice(0, 60);
    result.textContent = name ? `Hello, ${name}! The module is running.` : 'Hello from TYB Studio! The module is running.';
  });
})();
