document.addEventListener("DOMContentLoaded", () => {
    const initialBg = document.querySelector('.initial-background');
    const initialBgShown = sessionStorage.getItem('initialBgShown');
    const mainBg = document.querySelector('.main-background');
    const cloud = document.querySelector('.cloud-text');
    const gradientBg = document.querySelector('.gradient-background');
    const circleContainer = document.querySelector('.circle-container'); 
    
    
    
    if (cloud) {
        cloud.style.opacity = '0';
    }

    if (initialBg) {
        initialBg.style.display = "block";
    }
    if (mainBg) {
        mainBg.style.display = "none";
    }
    if (gradientBg) {
        gradientBg.style.opacity = '0'; 
    }
    if (circleContainer) {
        circleContainer.style.opacity = '0'; 
    }


    if (!initialBgShown) {
        if (cloud) cloud.style.opacity = '0';
        if (initialBg) initialBg.style.display = "block";
        if (mainBg) mainBg.style.display = "none";
        if (gradientBg) gradientBg.style.opacity = '0';
        if (circleContainer) circleContainer.style.opacity = '0';

        setTimeout(() => {
            document.body.classList.add('flip-page');
            setTimeout(() => {
                if (initialBg) initialBg.style.display = "none";
                if (mainBg) mainBg.style.display = "block";
                if (gradientBg) gradientBg.style.opacity = '1';
                document.body.classList.remove('flip-page');

                setTimeout(() => {
                    if (cloud) {
                        cloud.style.transition = 'opacity 1s ease-in-out';
                        cloud.style.opacity = '1';
                    }
                }, 300);

                if (circleContainer) {
                    setTimeout(() => {
                        circleContainer.style.transition = 'opacity 1s ease-in-out';
                        circleContainer.style.opacity = '1';
                    }, 300);
                }
            }, 1500);
        }, 3000);

        sessionStorage.setItem('initialBgShown', 'true');
    } else {
        if (initialBg) initialBg.style.display = "none";
        if (mainBg) mainBg.style.display = "block";
        if (gradientBg) gradientBg.style.opacity = '1';
        if (cloud) {
            cloud.style.opacity = '1';
        }
        if (circleContainer) {
            circleContainer.style.opacity = '1';
        }
    }

    const menuBtn = document.querySelector('.nav-menu-btn');
    const navMenu = document.querySelector('.nav-menu');

    if (menuBtn && navMenu) {
        menuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    const dropdown = document.querySelector(".dropdown");
    const dropdownToggle = document.querySelector(".dropdown-toggle");
    const dropdownMenu = document.querySelector(".dropdown-menu");

    if (dropdownToggle && dropdownMenu) {
        dropdownMenu.classList.remove("active");

        dropdownToggle.addEventListener("click", (event) => {
            event.preventDefault();
            dropdownMenu.classList.toggle("active");
        });

        document.addEventListener("click", (event) => {
            if (!dropdown.contains(event.target)) {
                dropdownMenu.classList.remove("active");
            }
        });
    }

    const navLinks = document.querySelectorAll('.nav-menu ul li .link');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(item => {
                item.classList.remove('active');
            });
            link.classList.add('active');
        });
    });

    document.addEventListener('click', (event) => {
        if (!navMenu.contains(event.target) && !menuBtn.contains(event.target) && !dropdown.contains(event.target) && !dropdownToggle.contains(event.target)) {
            navLinks.forEach(link => {
                link.classList.remove('active');
            });
        }
    });

    document.addEventListener("DOMContentLoaded", () => {
        const body = document.body;

        function checkScroll() {
            if (body.scrollHeight > window.innerHeight) {
                body.classList.add('scroll-enabled');
            } else {
                body.classList.remove('scroll-enabled');
            }
        }

        checkScroll();
    
        window.addEventListener('resize', checkScroll);

        const observer = new MutationObserver(checkScroll);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class"]
        });
    });

    if (!window.location.pathname.includes("nosotros.html")) {
    }

    const cuadros = document.querySelectorAll(".text-box");
    cuadros.forEach(cuadro => {
        cuadro.addEventListener("click", function() {
            this.classList.toggle("clicked"); 
        });
    });   
});

async function cargarMiniaturasLibros() {
    try {
        const contenedores = document.querySelectorAll('.libros-miniatura');
        
        for (const contenedor of contenedores) {
            const categoria = contenedor.dataset.categoria;

            const q = query(
                collection(db, "libros"),
                where("categoria", "==", categoria),
                limit(4) 
            );

            const querySnapshot = await getDocs(q);
            
            contenedor.innerHTML = querySnapshot.empty 
                ? `<p class="no-libros">No hay libros en ${categoria.replace('-', ' ')} aún.</p>`
                : Array.from(querySnapshot.docs).map(doc => {
                    const libro = doc.data();
                    return `
                        <div class="libro-mini" onclick="window.location='libros.html?categoria=${categoria}'">
                            <img src="${libro.imagen_url}" 
                                 alt="${libro.titulo}"
                                 title="${libro.titulo} - ${libro.autor}"
                                 onerror="this.src='https://via.placeholder.com/100x150?text=Imagen+no+disponible'">
                        </div>
                    `;
                }).join('');
        }
    } catch (error) {
        console.error("Error cargando miniaturas:", error);
        document.querySelectorAll('.libros-miniatura').forEach(c => {
            c.innerHTML = '<p class="error-libros">Error cargando libros. Intenta recargar.</p>';
        });
    }
}