document.addEventListener("DOMContentLoaded", async () => {
  
  // FIREBASE INITIALIZE 
  
  try {
    const contenedor = document.getElementById("libros-container");
    contenedor.innerHTML = '<div class="loading">Inicializando aplicación...</div>';
    
    const MAX_WAIT_TIME = 5000; 
    const CHECK_INTERVAL = 100; 
    let timeWaited = 0;
    
    await new Promise((resolve, reject) => {
      const checkInitialization = () => {
        if (window.firebaseData && window.firebaseData.db && window.firebaseData.firestore) {
          console.log("Firebase inicializado correctamente:", window.firebaseData);
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
    if (!db || !firestore || !firestore.collection || !firestore.query) {
      throw new Error("Firebase se inicializó pero faltan componentes esenciales");
    }

  } catch (error) {
    console.error("Error inicializando Firebase:", error);
    const contenedor = document.getElementById("libros-container");
    
    let errorMessage = `
      <div class="error">
        <h3>Error de conexión</h3>
        <p>No podemos conectarnos a la base de datos en este momento.</p>
        <p>Por favor:</p>
        <ul>
          <li>Verifica tu conexión a internet</li>
          <li>Recarga la página</li>
          <li>Intenta nuevamente más tarde</li>
        </ul>
    `;
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      errorMessage += `
        <div class="technical-details">
          <p><strong>Detalles técnicos:</strong></p>
          <p>${error.message}</p>
          <p>Configuración usada: ${JSON.stringify(window.firebaseData || {}, null, 2)}</p>
        </div>
      `;
    }
    
    errorMessage += `</div>`;
    contenedor.innerHTML = errorMessage;
    
    const retryButton = document.createElement('button');
    retryButton.textContent = 'Reintentar conexión';
    retryButton.className = 'retry-button';
    retryButton.onclick = () => window.location.reload();
    contenedor.appendChild(retryButton);
    
    return;
  }

  let currentCategory = null;
  let allBooksInCategory = [];
  let currentImages = [];
  let currentImgIndex = 0;

  function resaltarCoincidencias(texto, termino) {
    if (!termino) return texto;
    const regex = new RegExp(`(${termino})`, 'gi');
    return texto.replace(regex, '<span class="highlight">$1</span>');
  }

  function renderizarLibros(libros) {
    const contenedor = document.getElementById("libros-container");
    contenedor.innerHTML = '';

    if (libros.length === 0) {
      contenedor.innerHTML = `<p>No se encontraron libros que coincidan con tu búsqueda.</p>`;
      return;
    }

    libros.forEach(libro => {
      const div = document.createElement("div");
      div.className = "libro";

      const todasLasImagenes = libro.imagenes_urls || [libro.imagen_url];
      let currentImageIndex = 0;

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
      imagenesContainer.appendChild(imgPrincipal);
      
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
          counter.textContent = `${currentImageIndex + 1}/${todasLasImagenes.length}`;
        });
        navControls.appendChild(prevBtn);

        const nextBtn = document.createElement("button");
        nextBtn.className = "image-nav-btn next";
        nextBtn.innerHTML = '<i class="bx bx-chevron-right"></i>';
        nextBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          currentImageIndex = (currentImageIndex + 1) % todasLasImagenes.length;
          imgPrincipal.src = todasLasImagenes[currentImageIndex].replace('/upload/', '/upload/w_500,h_500,c_fill/');
          counter.textContent = `${currentImageIndex + 1}/${todasLasImagenes.length}`;
        });
        navControls.appendChild(nextBtn);
        
        imagenesContainer.appendChild(navControls);
        
        const counter = document.createElement("div");
        counter.className = "image-counter";
        counter.textContent = `1/${todasLasImagenes.length}`;
        imagenesContainer.appendChild(counter);
      }

      imagenesContainer.addEventListener("click", () => {
        const images = todasLasImagenes.map((url, index) => ({
          src: url.replace('/upload/', '/upload/w_800,h_800,c_fill/'),
          alt: `${libro.titulo}`
        }));
        
        openImageModal(images, currentImageIndex);
      });

      imagenesContainer.querySelectorAll('.image-nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      });

      div.appendChild(imagenesContainer);

      const tituloLibro = document.createElement("h3");
      const searchTerm = document.getElementById("search-input")?.value.trim().toLowerCase() || '';
      tituloLibro.innerHTML = searchTerm ? resaltarCoincidencias(libro.titulo, searchTerm) : libro.titulo;
      div.appendChild(tituloLibro);

      const autor = document.createElement("p");
      autor.innerHTML = `<strong>Autor:</strong> ${searchTerm ? resaltarCoincidencias(libro.autor, searchTerm) : libro.autor}`;
      div.appendChild(autor);

      const precio = document.createElement("p");
      precio.innerHTML = `<strong>Precio:</strong> $${libro.precio.toFixed(2)}`;
      div.appendChild(precio);

      const estado = document.createElement("p");
      estado.innerHTML = `<strong>Estado:</strong> ${libro.estado.charAt(0).toUpperCase() + libro.estado.slice(1)}`;
      div.appendChild(estado);

      if (libro.descripcion) {
        const descripcion = document.createElement("p");
        descripcion.className = "descripcion";
        descripcion.innerHTML = `<strong>Descripción:</strong> ${libro.descripcion}`;
        div.appendChild(descripcion);
      }

      contenedor.appendChild(div);
    });
  }

  function buscarEnCategoria(terminoBusqueda) {
    if (!allBooksInCategory.length) return;

    const termino = terminoBusqueda.toLowerCase().trim();
    
    if (!termino) {
      renderizarLibros(allBooksInCategory);
      return;
    }

    const librosFiltrados = allBooksInCategory.filter(libro => 
      libro.titulo.toLowerCase().includes(termino) || 
      libro.autor.toLowerCase().includes(termino)
    );

    renderizarLibros(librosFiltrados);
  }

  async function cargarLibrosPorCategoria(categoria) {
    currentCategory = categoria;
    const titulo = document.getElementById("titulo-categoria");
    const contenedor = document.getElementById("libros-container");

    titulo.textContent = categoria.replace(/-/g, " ").toUpperCase();
    contenedor.innerHTML = '<div class="loading">Cargando libros...</div>';

    try {
      const { db, firestore } = window.firebaseData;
      const q = firestore.query(
        firestore.collection(db, "libros"),
        firestore.where("categoria", "==", categoria)
      );

      const querySnapshot = await firestore.getDocs(q);
      allBooksInCategory = querySnapshot.docs.map(doc => doc.data());

      if (querySnapshot.empty) {
        contenedor.innerHTML = `<p>Todavía no subimos libros en ${categoria.replace(/-/g, ' ')}😟.</p>`;
        return;
      }

      const searchInput = document.getElementById("search-input");
      if (searchInput && searchInput.value.trim()) {
        buscarEnCategoria(searchInput.value.trim());
      } else {
        renderizarLibros(allBooksInCategory);
      }

    } catch (error) {
      console.error("Error cargando libros:", error);
      contenedor.innerHTML = `
        <p class="error">Error al cargar los libros. 
        <button onclick="location.reload()">Reintentar</button>
        </p>
      `;
    }
  }

  function openImageModal(images, startIndex = 0) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    const captionText = document.getElementById("caption");
    const closeBtn = modal.querySelector(".close-modal");
    const prevBtn = modal.querySelector(".modal-nav-btn.prev");
    const nextBtn = modal.querySelector(".modal-nav-btn.next");
    const zoomLens = document.querySelector(".zoom-lens");
    const zoomPreview = document.querySelector(".zoom-preview");
    const zoomContainer = document.querySelector(".zoom-container");

    let isZoomActive = false;
    let zoomTimeout = null;
    
    currentImages = images;
    currentImgIndex = startIndex;

    modalImg.src = images[startIndex].src;
    modalImg.style.display = "block";
    modalImg.style.maxWidth = "70%";
    modalImg.style.maxHeight = "85vh";
    modalImg.style.minWidth = "400px";
    captionText.textContent = images[startIndex].alt;
    modal.style.display = "flex";
    
    function setupZoom() {
      const oldZoomArea = zoomContainer.querySelector('.zoom-area');
      if (oldZoomArea) {
          oldZoomArea.remove();
      }
      
      const zoomArea = document.createElement('div');
      zoomArea.className = 'zoom-area';
      zoomArea.style.position = 'absolute';
      zoomArea.style.top = '0';
      zoomArea.style.left = '0';
      zoomArea.style.width = '100%';
      zoomArea.style.height = '100%';
      zoomArea.style.zIndex = '8';
      zoomArea.style.cursor = 'crosshair';
      
      zoomContainer.appendChild(zoomArea);

      const imgRect = modalImg.getBoundingClientRect();
      const lensSize = Math.min(150, imgRect.width * 0.3, imgRect.height * 0.3);
      zoomLens.style.width = `${lensSize}px`;
      zoomLens.style.height = `${lensSize}px`;
      zoomLens.style.borderRadius = '50%';
      
      let zoomTimeout = null;
      let isMouseInArea = false;
      let lastMousePosition = { x: 0, y: 0 };

      function activateZoom() {
          if (zoomTimeout) {
              clearTimeout(zoomTimeout);
              zoomTimeout = null;
          }
          
          if (!isZoomActive) {
              zoomLens.style.display = 'block';
              zoomPreview.style.display = 'block';
              isZoomActive = true;
          }
      }

      function scheduleDeactivation() {
          if (zoomTimeout) {
              clearTimeout(zoomTimeout);
          }
          
          zoomTimeout = setTimeout(() => {
              if (!isMouseInArea) {
                  zoomLens.style.display = 'none';
                  zoomPreview.style.display = 'none';
                  isZoomActive = false;
              }
          }, 300);
      }
      
      function isMouseInValidArea(e) {
          const containerRect = zoomContainer.getBoundingClientRect();
          const imgRect = modalImg.getBoundingClientRect();
          const toleranceTop = 80;    
          const toleranceBottom = 80; 
          const toleranceLeft = 80;   
          const toleranceRight = 80;  
          
          const expandedRect = {
              left: Math.max(containerRect.left, imgRect.left - toleranceLeft),
              right: Math.min(containerRect.right, imgRect.right + toleranceRight),
              top: Math.max(containerRect.top, imgRect.top - toleranceTop),
              bottom: Math.min(containerRect.bottom, imgRect.bottom + toleranceBottom)
          };
          
          return (
              e.clientX >= expandedRect.left &&
              e.clientX <= expandedRect.right &&
              e.clientY >= expandedRect.top &&
              e.clientY <= expandedRect.bottom
          );
      }
      
      function updateZoomPosition(e) {
          const imgRect = modalImg.getBoundingClientRect();
          const containerRect = zoomContainer.getBoundingClientRect();
          const lensSize = parseInt(zoomLens.style.width) || 150;
          const halfLens = lensSize / 2;
          
         
          let x = e.clientX - containerRect.left;
          let y = e.clientY - containerRect.top;
      
          const imgLeft = imgRect.left - containerRect.left;
          const imgRight = imgRect.right - containerRect.left;
          const imgTop = imgRect.top - containerRect.top;
          const imgBottom = imgRect.bottom - containerRect.top;
   
          x = Math.max(imgLeft + halfLens, Math.min(imgRight - halfLens, x));
          y = Math.max(imgTop + halfLens, Math.min(imgBottom - halfLens, y));

          zoomLens.style.left = `${x - halfLens}px`;
          zoomLens.style.top = `${y - halfLens}px`;
 
          const imgX = e.clientX - imgRect.left;
          const imgY = e.clientY - imgRect.top;
     
          const clampedImgX = Math.max(0, Math.min(imgRect.width, imgX));
          const clampedImgY = Math.max(0, Math.min(imgRect.height, imgY));
          
          const relativeX = (clampedImgX / imgRect.width) * 100;
          const relativeY = (clampedImgY / imgRect.height) * 100;
      
          zoomPreview.style.backgroundImage = `url('${modalImg.src}')`;
          zoomPreview.style.backgroundSize = `${imgRect.width * 2.5}px ${imgRect.height * 2.5}px`;
          zoomPreview.style.backgroundPosition = `${relativeX}% ${relativeY}%`;

          lastMousePosition = { x: e.clientX, y: e.clientY };
      }

      zoomArea.addEventListener('mouseenter', (e) => {
          e.stopPropagation();
          if (isMouseInValidArea(e)) {
              isMouseInArea = true;
              activateZoom();
          }
      });
      
      zoomArea.addEventListener('mousemove', (e) => {
          e.stopPropagation();

          if (isMouseInValidArea(e)) {
              if (!isMouseInArea) {
                  isMouseInArea = true;
                  activateZoom();
              }
              updateZoomPosition(e);
          } else {
              if (isMouseInArea) {
                  isMouseInArea = false;
                  scheduleDeactivation();
              }
          }
      });
      
      zoomArea.addEventListener('mouseleave', (e) => {
          e.stopPropagation();
          
          const rect = zoomArea.getBoundingClientRect();
          const toleranceLeave = 50; 

          if (
              e.clientX < rect.left - toleranceLeave || 
              e.clientX > rect.right + toleranceLeave || 
              e.clientY < rect.top - toleranceLeave || 
              e.clientY > rect.bottom + toleranceLeave
          ) {
              isMouseInArea = false;
              scheduleDeactivation();
          }
      });

      zoomContainer.addEventListener('mouseleave', (e) => {
          const rect = zoomContainer.getBoundingClientRect();
          const containerTolerance = 100; 
          
          if (
              e.clientX < rect.left - containerTolerance || 
              e.clientX > rect.right + containerTolerance || 
              e.clientY < rect.top - containerTolerance || 
              e.clientY > rect.bottom + containerTolerance
          ) {
              isMouseInArea = false;
              scheduleDeactivation();
          }
      });

      zoomArea._cleanup = function() {
          if (zoomTimeout) {
              clearTimeout(zoomTimeout);
          }
      };

      zoomLens.style.pointerEvents = 'none';
      zoomPreview.style.pointerEvents = 'none';
    }
    
    function showImage(index) {
      currentImgIndex = (index + images.length) % images.length;
      modalImg.src = images[currentImgIndex].src;
      captionText.textContent = images[currentImgIndex].alt;

      isZoomActive = false;
      zoomLens.style.display = 'none';
      zoomPreview.style.display = 'none';

      modalImg.onload = function() {
        setTimeout(setupZoom, 50);
      };
      
      if (modalImg.complete) {
        setTimeout(setupZoom, 50);
      }
    }

    modalImg.onload = function() {
      setTimeout(setupZoom, 50);
    };
    
    if (modalImg.complete) {
      setTimeout(setupZoom, 50);
    }

    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showImage(currentImgIndex - 1);
    });
    
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showImage(currentImgIndex + 1);
    });

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
      isZoomActive = false;
      if (zoomTimeout) clearTimeout(zoomTimeout);
      
      modal.style.display = "none";
      document.removeEventListener("keydown", handleKeydown);

      const zoomArea = zoomContainer.querySelector('.zoom-area');
      if (zoomArea && zoomArea._cleanup) {
        zoomArea._cleanup();
      }

      zoomLens.style.display = 'none';
      zoomPreview.style.display = 'none';
    }

    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
    
    document.addEventListener("keydown", handleKeydown);
  }

  function configurarBusqueda() {
    const searchInput = document.getElementById("search-input");
    const searchButton = document.getElementById("search-button") || 
                         document.querySelector(".search-bar i.bx-search");

    if (searchButton) {
      searchButton.addEventListener("click", () => {
        if (currentCategory && searchInput.value.trim()) {
          buscarEnCategoria(searchInput.value.trim());
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && currentCategory && searchInput.value.trim()) {
          buscarEnCategoria(searchInput.value.trim());
        }
      });
    }
  }

  const params = new URLSearchParams(window.location.search);
  const categoria = params.get("categoria");

  if (!categoria) {
    document.getElementById("libros-container").innerHTML = "<p>Selecciona una categoría desde el menú.</p>";
    return;
  }

  configurarBusqueda();
  await cargarLibrosPorCategoria(categoria);
});