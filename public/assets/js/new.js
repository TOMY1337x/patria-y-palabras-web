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

            const img = document.createElement("img");
            img.src = libro.imagen_url;
            img.alt = libro.titulo;
            img.loading = "lazy";
            img.title = `${libro.titulo} - ${libro.autor}`;
            div.appendChild(img);

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

function inicializarModal() {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const captionText = document.getElementById("caption");
    const closeBtn = document.querySelector(".close-modal");
    const prevBtn = document.querySelector(".modal-nav-btn.prev");
    const nextBtn = document.querySelector(".modal-nav-btn.next");

    let currentImages = [];
    let currentImgIndex = 0;

    const bookImages = document.querySelectorAll('.libro img');

    bookImages.forEach(img => {
        img.addEventListener('click', function() {
            // Asumimos que cada libro tiene un array de imágenes en un atributo data-images
            // o solo una imagen si no hay array
            const imagesData = this.dataset.images ? JSON.parse(this.dataset.images) : [this.src];
            
            currentImages = imagesData.map(url => ({
                src: url,
                alt: this.alt || "Imagen del libro"
            }));
            
            currentImgIndex = 0; // Empezar con la primera imagen
            
            showImage(currentImgIndex);
            modal.style.display = "block";
        });
    });

    function showImage(index) {
        currentImgIndex = (index + currentImages.length) % currentImages.length;
        modalImg.src = currentImages[currentImgIndex].src;
        captionText.innerHTML = currentImages[currentImgIndex].alt;
        
        // Efecto de transición suave
        modalImg.style.transform = "scale(0.95)";
        setTimeout(() => {
            modalImg.style.transform = "scale(1)";
            modalImg.style.transition = "transform 0.3s ease";
        }, 10);
    }

    // Navegación con flechas
    prevBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showImage(currentImgIndex - 1);
    });

    nextBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showImage(currentImgIndex + 1);
    });

    // Navegación con teclado
    document.addEventListener('keydown', function(e) {
        if (modal.style.display === "block") {
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                showImage(currentImgIndex - 1);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                showImage(currentImgIndex + 1);
            } else if (e.key === "Escape") {
                modal.style.display = "none";
            }
        }
    });

    closeBtn.addEventListener('click', function() {
        modal.style.display = "none";
    });

    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
}