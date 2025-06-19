document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("libros-container");
    
    // Variables para el modal de imágenes
    let currentImages = [];
    let currentImgIndex = 0;
    
    try {
        contenedor.innerHTML = '<div class="loading">Cargando novedades...</div>';
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

            // Crear contenedor de imágenes con navegación
            const imagenesContainer = document.createElement("div");
            imagenesContainer.className = "libro-imagenes-container";
            imagenesContainer.title = "Haz clic para ampliar";

            const imgWrapper = document.createElement("div");
            imgWrapper.className = "imagen-wrapper";
            
            const imgPrincipal = document.createElement("img");
            imgPrincipal.src = todasLasImagenes[0].replace('/upload/', '/upload/w_500,h_500,c_fill/');
            imgPrincipal.alt = libro.titulo;
            imgPrincipal.loading = "lazy";
            imgPrincipal.className = "imagen-principal";
            imgPrincipal.title = `${libro.titulo} - ${libro.autor}`;
            imagenesContainer.appendChild(imgPrincipal);
            
            // Agregar controles de navegación si hay más de una imagen
            if (todasLasImagenes.length > 1) {
                const navControls = document.createElement("div");
                navControls.className = "image-nav-controls";

                const prevBtn = document.createElement("button");
                prevBtn.className = "image-nav-btn prev";
                prevBtn.innerHTML = '<i class="bx bx-chevron-left"></i>';
                prevBtn.title = "Imagen anterior";
                prevBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    currentImageIndex = (currentImageIndex - 1 + todasLasImagenes.length) % todasLasImagenes.length;
                    imgPrincipal.src = todasLasImagenes[currentImageIndex].replace('/upload/', '/upload/w_500,h_500,c_fill/');
                    counter.textContent = `${currentImageIndex + 1}/${todasLasImagenes.length}`;
                });
                navControls.appendChild(prevBtn);

                const nextBtn = document.createElement("button");
                nextBtn.className = "image-nav-btn next";
                nextBtn.innerHTML = '<i class="bx bx-chevron-right"></i>';
                nextBtn.title = "Siguiente imagen";
                nextBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    currentImageIndex = (currentImageIndex + 1) % todasLasImagenes.length;
                    imgPrincipal.src = todasLasImagenes[currentImageIndex].replace('/upload/', '/upload/w_500,h_500,c_fill/');
                    counter.textContent = `${currentImageIndex + 1}/${todasLasImagenes.length}`;
                });
                navControls.appendChild(nextBtn);
                
                imagenesContainer.appendChild(navControls);
                
                // Contador de imágenes
                const counter = document.createElement("div");
                counter.className = "image-counter";
                counter.textContent = `1/${todasLasImagenes.length}`;
                imagenesContainer.appendChild(counter);
            }

            // Evento para abrir modal al hacer clic en la imagen
            imagenesContainer.addEventListener("click", () => {
                const images = todasLasImagenes.map((url, index) => ({
                    src: url.replace('/upload/', '/upload/w_800,h_800,c_fill/'),
                    alt: `${libro.titulo}`
                }));
                
                openImageModal(images, currentImageIndex);
            });

            // Prevenir que los botones de navegación abran el modal
            imagenesContainer.querySelectorAll('.image-nav-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            });

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

            const estado = document.createElement("p");
            estado.innerHTML = `<strong>Estado:</strong> ${libro.estado ? libro.estado.charAt(0).toUpperCase() + libro.estado.slice(1) : 'N/A'}`;
            div.appendChild(estado);

            if (libro.descripcion) {
                const descripcion = document.createElement("p");
                descripcion.className = "descripcion";
                descripcion.innerHTML = `<strong>Descripción:</strong> ${libro.descripcion}`;
                div.appendChild(descripcion);
            }

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

function openImageModal(images, startIndex = 0) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const captionText = document.getElementById("caption");
    const closeBtn = modal.querySelector(".close-modal");
    const prevBtn = modal.querySelector(".modal-nav-btn.prev");
    const nextBtn = modal.querySelector(".modal-nav-btn.next");
    
    currentImages = images;
    currentImgIndex = startIndex;

    modalImg.src = images[startIndex].src;
    modalImg.style.display = "block";
    modalImg.style.maxWidth = "90%";
    modalImg.style.maxHeight = "90vh";
    modalImg.style.objectFit = "contain";
    captionText.textContent = images[startIndex].alt;
    modal.style.display = "flex";
    
    function showImage(index) {
        currentImgIndex = (index + images.length) % images.length;
        modalImg.src = images[currentImgIndex].src;
        captionText.textContent = images[currentImgIndex].alt;
    }

    // Solo agregar eventos si los botones existen
    if (prevBtn) {
        prevBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            showImage(currentImgIndex - 1);
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            showImage(currentImgIndex + 1);
        });
    }

    function handleKeydown(e) {
        if (modal.style.display === "flex") {
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                showImage(currentImgIndex - 1);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                showImage(currentImgIndex + 1);
            } else if (e.key === "Escape") {
                closeModal();
            }
        }
    }
    
    function closeModal() {
        modal.style.display = "none";
        document.removeEventListener("keydown", handleKeydown);
    }

    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    document.addEventListener("keydown", handleKeydown);
}