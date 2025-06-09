function configurarSubmenus() {
    const submenus = document.querySelectorAll('.dropdown-submenu');
    let hoverTimeout;
    let activeMenu = null;

    function closeAllSubmenus() {
        submenus.forEach(sm => {
            sm.classList.remove('active');
        });
        activeMenu = null;
    }

    submenus.forEach(submenu => {
        const link = submenu.querySelector('a');

        if (window.innerWidth > 768) {
            link.addEventListener('click', (e) => e.preventDefault());

            submenu.addEventListener('mouseenter', () => {
                clearTimeout(hoverTimeout);
                if (activeMenu !== submenu) {
                    closeAllSubmenus();
                }
                activeMenu = submenu;
                submenu.classList.add('active');
            });

            submenu.addEventListener('mouseleave', (e) => {
                const relatedTarget = e.relatedTarget;
                if (!relatedTarget || !submenu.contains(relatedTarget)) {
                    hoverTimeout = setTimeout(() => {
                        if (activeMenu === submenu) {
                            submenu.classList.remove('active');
                            activeMenu = null;
                        }
                    }, 200);
                }
            });

            const dropdownMenu = submenu.querySelector('.dropdown-menu');
            if (dropdownMenu) {
                dropdownMenu.addEventListener('mouseenter', () => {
                    clearTimeout(hoverTimeout);
                });

                dropdownMenu.addEventListener('mouseleave', (e) => {
                    const relatedTarget = e.relatedTarget;
                    if (!relatedTarget || !submenu.contains(relatedTarget)) {
                        hoverTimeout = setTimeout(() => {
                            if (activeMenu === submenu) {
                                submenu.classList.remove('active');
                                activeMenu = null;
                            }
                        }, 150);
                    }
                });
            }
        }
        else {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (activeMenu === submenu) {
                    closeAllSubmenus();
                } else {
                    closeAllSubmenus();
                    submenu.classList.add('active');
                    activeMenu = submenu;
                }
            });
        }
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown-submenu') &&
            !e.target.closest('.dropdown-menu')) {
            closeAllSubmenus();
        }
    });

    window.addEventListener('resize', function() {
        closeAllSubmenus();
        clearTimeout(hoverTimeout);
    });
}

document.addEventListener('DOMContentLoaded', configurarSubmenus);