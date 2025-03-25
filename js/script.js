// Enhanced JavaScript for modern features
document.addEventListener('DOMContentLoaded', () => {
    // Mobile navigation toggle
    const burger = document.querySelector('.burger');
    const nav = document.querySelector('.nav-links');
    const navLinks = document.querySelectorAll('.nav-links li');
    
    // Toggle navigation
    if (burger) {
        burger.addEventListener('click', () => {
            // Toggle nav
            nav.classList.toggle('nav-active');
            
            // Animate links
            navLinks.forEach((link, index) => {
                if (link.style.animation) {
                    link.style.animation = '';
                } else {
                    link.style.animation = `navLinkFade 0.5s ease forwards ${index / 7 + 0.3}s`;
                }
            });
            
            // Burger animation
            burger.classList.toggle('toggle');
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Add active class to current navigation item
    const currentLocation = location.href;
    const menuItems = document.querySelectorAll('.nav-links a');
    const menuLength = menuItems.length;

    for (let i = 0; i < menuLength; i++) {
        if (menuItems[i].href === currentLocation) {
            menuItems[i].classList.add('active');
        }
    }
    
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Scroll reveal animation
document.addEventListener('DOMContentLoaded', () => {
    const revealElements = document.querySelectorAll('.reveal');
    
    function checkReveal() {
        const triggerBottom = window.innerHeight * 0.8;
        
        revealElements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementBottom = element.getBoundingClientRect().bottom;
            
            if (elementTop < triggerBottom && elementBottom > 0) {
                element.classList.add('active');
            } else {
                element.classList.remove('active');
            }
        });
    }
    
    // Initial reveal of elements already in view
    function initialReveal() {
        revealElements.forEach(element => {
            if (element.getBoundingClientRect().top < window.innerHeight * 0.8) {
                element.classList.add('active');
            }
        });
    }
    
    // Call initial reveal when DOM is fully loaded
    initialReveal();
    
    // Add scroll event listener
    window.addEventListener('scroll', checkReveal);
    
    // Add reveal class to appropriate elements
    document.querySelectorAll('.book-card, .character-card, .book-section, .character-section').forEach(element => {
        element.classList.add('reveal');
    });
});    
    // Dark mode toggle functionality (placeholder)
    const darkModeToggle = document.querySelector('.dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
    }
});
