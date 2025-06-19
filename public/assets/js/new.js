document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("libros-container");
    
    try {
        contenedor.innerHTML = '<div class="loading-spinner"><i class="bx bx-loader-circle bx-spin"></i><p>Cargando novedades...</p></div>';
        const MAX_WAIT_TIME = 5000;
        const CHECK_INTERVAL = 100;
        let timeWaited = 0;
        
        await new Promise((resolve, reject) => {
            const checkInitialization = () => {
                if (window.firebaseData && window.firebaseData.db && window.firebaseData.firestore) {
                    resolve();
                } else if (timeWaited >= MAX_WAIT_TIME) {
                    reject(new Error("Tiempo de espera agotado. Firebase no se inicializó."));
                } else {
                    timeWaited += CHECK_INTERVAL;
                    setTimeout(checkInitialization, CHECK_INTERVAL);
                }
            };
            checkInitialization();
        });

        const { db, firestore } = window.firebaseData;
        const { collection, query, getDocs, orderBy, limit } = firestore;
        const librosRef = collection(db, "libros");
        const q = query(librosRef, orderBy("fecha", "desc"), limit(30));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            contenedor.innerHTML = "<p>No hay libros recientes 😟.</p>";
            return;
        }

        contenedor.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const libro = doc.data();
            console.log("Mostrando libro:", libro.titulo);

            const div = document.createElement("div");
            div.className = "libro";

            // Obtener todas las imágenes del libro
            const todasLasImagenes = libro.imagenes_urls || [libro.imagen_url];
            let currentImageIndex = 0;

            const imagenesContainer = document.createElement("div");
            imagenesContainer.className = "libro-imagenes-container";
            imagenesContainer.title = "Haz clic para ampliar";

            const imgPrincipal = document.createElement("img");
            imgPrincipal.src = todasLasImagenes[0].replace('/upload/', '/upload/w_500,h_500,c_fill/');
            imgPrincipal.alt = `${libro.titulo} - ${libro.autor}`;
            imgPrincipal.loading = "lazy";
            imgPrincipal.className = "imagen-principal";
            imagenesContainer.appendChild(imgPrincipal);
            
            // Añadir controles de navegación si hay múltiples imágenes
            if (todasLasImagenes.length > 1) {
                const navControls = document.createElement("div");
                navControls.className = "image-nav-controls";

                const prevBtn = document.createElement("button");
                prevBtn.className = "image-nav-btn prev";
                prevBtn.innerHTML = '<i class="bx bx-chevron-left"></i>';
                prevBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    currentImageIndex = (currentImageIndex - 1 + todasLasImagenes.length) % todasLasImagenes.length;
                    imgPrincipal.src = todasLasImagenes[currentImageIndex].replace('/upload/', '/upload/w_500,h_500,c_fill/');
                });
                navControls.appendChild(prevBtn);

                const nextBtn = document.createElement("button");
                nextBtn.className = "image-nav-btn next";
                nextBtn.innerHTML = '<i class="bx bx-chevron-right"></i>';
                nextBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    currentImageIndex = (currentImageIndex + 1) % todasLasImagenes.length;
                    imgPrincipal.src = todasLasImagenes[currentImageIndex].replace('/upload/', '/upload/w_500,h_500,c_fill/');
                });
                navControls.appendChild(nextBtn);
                
                imagenesContainer.appendChild(navControls);
            }

            imagenesContainer.addEventListener("click", () => {
                const images = todasLasImagenes.map((url, index) => ({
                    src: url.replace('/upload/', '/upload/w_800,h_800,c_fill/'),
                    alt: `${libro.titulo} - ${libro.autor}`
                }));
                openImageModal(images, currentImageIndex);
            });

            // Prevenir que los clicks en los botones activen el modal
            if (imagenesContainer.querySelectorAll('.image-nav-btn').length > 0) {
                imagenesContainer.querySelectorAll('.image-nav-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });
                });
            }

            div.appendChild(imagenesContainer);

            const tituloLibro = document.createElement("h3");
            tituloLibro.textContent = libro.titulo;
            div.appendChild(tituloLibro);

            const categoria = document.createElement("p");
            categoria.innerHTML = `<strong>Categoría:</strong> ${formatearCategoria(libro.categoria)}`;
            div.appendChild(categoria);

            const autor = document.createElement("p");
            autor.innerHTML = `<strong>Autor:</strong> ${libro.autor}`;
            div.appendChild(autor);

            const precio = document.createElement("p");
            precio.innerHTML = `<strong>Precio:</strong> $${libro.precio?.toFixed(2) || "N/A"}`;
            div.appendChild(precio);

            contenedor.appendChild(div);
        });

    } catch (error) {
        console.error("Error:", error);
        let errorMessage = `
            <div class="error">
                <h3>Error al cargar novedades</h3>
                <p>${error.message}</p>
                <button class="retry-button" onclick="window.location.reload()">Reintentar</button>
            </div>
        `;
        contenedor.innerHTML = errorMessage;
    }
});

function formatearCategoria(categoria) {
    if (!categoria) return "Sin categoría";
    return categoria
        .replace(/-/g, ' ')  
        .split(' ')         
        .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1)) 
        .join(' ');        
}

// Variables para el estado del carrusel
let currentImages = [];
let currentImgIndex = 0;

// Función para abrir el modal con carrusel
function openImageModal(images, startIndex = 0) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const captionText = document.getElementById("caption");
    const closeBtn = modal.querySelector(".close-modal");
    const prevBtn = modal.querySelector(".modal-nav-btn.prev");
    const nextBtn = modal.querySelector(".modal-nav-btn.next");

    // Guardar estado
    currentImages = images;
    currentImgIndex = startIndex;

    // Mostrar imagen inicial
    showImage(startIndex);
    modal.style.display = "flex";

    // Función para mostrar imagen específica
    function showImage(index) {
        currentImgIndex = index;
        modalImg.src = currentImages[currentImgIndex].src;
        captionText.textContent = currentImages[currentImgIndex].alt;
        
        // Resetear zoom al cambiar imagen
        modalImg.classList.remove("zoomed");
    }

    // Alternar zoom al hacer clic
    modalImg.addEventListener("click", function() {
        this.classList.toggle("zoomed");
    });

    // Navegación con botones
    prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showImage((currentImgIndex - 1 + currentImages.length) % currentImages.length);
    });

    nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showImage((currentImgIndex + 1) % currentImages.length);
    });

    // Navegación con teclado
    function handleKeydown(e) {
        if (modal.style.display === "flex") {
            switch(e.key) {
                case "ArrowLeft":
                    e.preventDefault();
                    showImage((currentImgIndex - 1 + currentImages.length) % currentImages.length);
                    break;
                case "ArrowRight":
                    e.preventDefault();
                    showImage((currentImgIndex + 1) % currentImages.length);
                    break;
                case "Escape":
                    closeModal();
                    break;
                case " ":
                case "Enter":
                    modalImg.classList.toggle("zoomed");
                    break;
            }
        }
    }

    // Cerrar modal
    function closeModal() {
        modal.style.display = "none";
        document.removeEventListener("keydown", handleKeydown);
    }

    // Event listeners
    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    document.addEventListener("keydown", handleKeydown);
}