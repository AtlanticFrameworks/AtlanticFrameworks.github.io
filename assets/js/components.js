async function loadComponent(elementId, filePath) {
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
        const response = await fetch(filePath);
        if (response.ok) {
            const html = await response.text();
            element.innerHTML = html;

            // Re-run scripts if necessary (e.g. lucide icons need to be re-initialized)
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // Re-run i18n
            const savedLang = localStorage.getItem('lang') || 'de';
            if (typeof setLanguage === 'function') {
                setLanguage(savedLang);
            }

            // Highlight active link
            const currentPath = window.location.pathname.split('/').pop() || 'index.html';
            const navLinks = element.querySelectorAll('nav a');
            navLinks.forEach(link => {
                if (link.getAttribute('href') === currentPath) {
                    link.classList.add('text-white');
                    link.classList.remove('text-gray-400');
                    const span = link.querySelector('span');
                    if (span) span.style.width = '100%';
                }
            });

        } else {
            console.error(`Failed to load ${filePath}: ${response.statusText}`);
        }
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadComponent('navbar-container', 'assets/components/header.html');
    loadComponent('footer-container', 'assets/components/footer.html');
});
