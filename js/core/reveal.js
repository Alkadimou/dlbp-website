// Animazione di comparsa: aggiunge la classe "active" agli elementi .reveal quando entrano nello schermo.
export function initRevealAnimations(rootMargin = "0px") {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: rootMargin
    });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
