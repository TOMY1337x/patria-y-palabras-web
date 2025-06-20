document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("libros-container");
    
    try {
        contenedor.innerHTML = '<div class="loading">Cargando novedades...</div>';
        const MAX_WAIT_TIME = 5000;
        const CHECK_INTERVAL = 100;
        let timeWaited = 0;
        
        await new Promise((resolve, reject) => {
            const checkInitialization = () => {
                if (window.firebaseData && window.firebaseData.db && window.firebaseData.firestore) {
                    console.log("Firebase inicializado correctamente");
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
            const div = document.createElement("div");
            div.className = "libro";

            const imagenesContainer = document.createElement("div");
            imagenesContainer.className = "libro-imagenes-container";

            const imagenes = libro.imagenes_urls ? 
                            (Array.isArray(libro.imagenes_urls) ? libro.imagenes_urls : [libro.imagenes_urls]) : 
                            [libro.imagen_url];

            div.dataset.imagenes = JSON.stringify(imagenes.map(img => 
                img.replace('/upload/', '/upload/w_800,h_800,c_fill/')
            ));

            const img = document.createElement("img");
            img.src = imagenes[0].replace('/upload/', '/upload/w_500,h_500,c_fill/');
            img.alt = `${libro.titulo} - ${libro.autor}`;
            img.loading = "lazy";
            img.className = "libro-imagen";
            imagenesContainer.appendChild(img);

            if (imagenes.length > 1) {
                let imagenActual = 0;

                const flechaIzquierda = document.createElement("button");
                flechaIzquierda.className = "carrusel-flecha izquierda";
                flechaIzquierda.innerHTML = "❮";
                flechaIzquierda.addEventListener("click", (e) => {
                    e.stopPropagation();
                    imagenActual = (imagenActual - 1 + imagenes.length) % imagenes.length;
                    img.src = imagenes[imagenActual].replace('/upload/', '/upload/w_500,h_500,c_fill/');
                    contador.textContent = `${imagenActual + 1}/${imagenes.length}`;
                });

                const flechaDerecha = document.createElement("button");
                flechaDerecha.className = "carrusel-flecha derecha";
                flechaDerecha.innerHTML = "❯";
                flechaDerecha.addEventListener("click", (e) => {
                    e.stopPropagation();
                    imagenActual = (imagenActual + 1) % imagenes.length;
                    img.src = imagenes[imagenActual].replace('/upload/', '/upload/w_500,h_500,c_fill/');
                    contador.textContent = `${imagenActual + 1}/${imagenes.length}`;
                    
                });

                imagenesContainer.appendChild(flechaIzquierda);
                imagenesContainer.appendChild(flechaDerecha);

                const contador = document.createElement("div");
                contador.className = "contador-imagenes";
                contador.textContent = `1/${imagenes.length}`;
                imagenesContainer.appendChild(contador);
            }

            div.appendChild(imagenesContainer);

            const tituloLibro = document.createElement("h3");
            tituloLibro.textContent = libro.titulo;
            div.appendChild(tituloLibro);

            const autor = document.createElement("p");
            autor.innerHTML = `<strong>Autor:</strong> ${libro.autor}`;
            div.appendChild(autor);

            const categoria = document.createElement("p");
            categoria.innerHTML = `<strong>Categoría:</strong> ${formatearCategoria(libro.categoria)}`;
            div.appendChild(categoria);

            const precio = document.createElement("p");
            precio.innerHTML = `<strong>Precio:</strong> $${libro.precio?.toFixed(2) || "N/A"}`;
            div.appendChild(precio);

            contenedor.appendChild(div);
        });

        inicializarModal();

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

let currentImageIndex = 0;
let currentBookImages = [];

function inicializarModal() {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const captionText = document.getElementById("caption");
    const closeBtn = document.querySelector(".close-modal");
    const leftArrow = document.querySelector(".left-arrow");
    const rightArrow = document.querySelector(".right-arrow");
    const modalCounter = document.querySelector(".modal-counter");

    document.querySelectorAll('.libro img').forEach((img, index) => {
        img.addEventListener('click', function() {
            const libro = this.closest('.libro');
            
            currentBookImages = libro.dataset.imagenes ? 
                JSON.parse(libro.dataset.imagenes) : 
                [this.src.replace('/upload/w_500,h_500,c_fill/', '/upload/w_800,h_800,c_fill/')];

            const currentSrc = this.src.replace('/upload/w_500,h_500,c_fill/', '/upload/w_800,h_800,c_fill/');
            currentImageIndex = currentBookImages.findIndex(img => img === currentSrc);
            if (currentImageIndex === -1) currentImageIndex = 0;

            modal.style.display = "block";
            modalImg.src = currentBookImages[currentImageIndex];
            captionText.textContent = this.alt;

            if (currentBookImages.length > 1) {
                leftArrow.style.display = "block";
                rightArrow.style.display = "block";
                modalCounter.style.display = "block";
                modalCounter.textContent = `${currentImageIndex + 1}/${currentBookImages.length}`;
            } else {
                leftArrow.style.display = "none";
                rightArrow.style.display = "none";
                modalCounter.style.display = "none";
            }
        });
    });

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });

    leftArrow.addEventListener('click', (e) => {
        e.stopPropagation();
        showPrevImage();
    });
    
    rightArrow.addEventListener('click', (e) => {
        e.stopPropagation();
        showNextImage();
    });

    document.addEventListener('keydown', function(e) {
        if (modal.style.display !== "block") return;
        
        switch(e.key) {
            case 'ArrowLeft':
                showPrevImage();
                e.preventDefault();
                break;
            case 'ArrowRight':
                showNextImage();
                e.preventDefault();
                break;
            case 'Escape':
                closeModal();
                break;
        }
    });
}

function updateModalImage() {
    const modalImg = document.getElementById("modalImage");
    const modalCounter = document.querySelector(".modal-counter");

    modalImg.style.opacity = 0;
    setTimeout(() => {
        modalImg.src = currentBookImages[currentImageIndex];
        modalImg.style.opacity = 1;

        if (modalCounter && currentBookImages.length > 1) {
            modalCounter.textContent = `${currentImageIndex + 1}/${currentBookImages.length}`;
        }
    }, 150);
}

function showPrevImage() {
    currentImageIndex = (currentImageIndex - 1 + currentBookImages.length) % currentBookImages.length;
    updateModalImage();
}

function showNextImage() {
    currentImageIndex = (currentImageIndex + 1) % currentBookImages.length;
    updateModalImage();
}

function updateModalImage() {
    const modalImg = document.getElementById("modalImage");
    const captionText = document.getElementById("caption");
    modalImg.src = currentBookImages[currentImageIndex];
}

function closeModal() {
    document.getElementById("imageModal").style.display = "none";
}