document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll(".dropdown-btn");
  
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const content = btn.nextElementSibling;
        const isVisible = content.style.display === "block";
        content.style.display = isVisible ? "none" : "block";
      });
    });
  });
  