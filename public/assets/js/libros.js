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
  let allBooksGlobal = [];
  let currentImages = [];
  let currentImgIndex = 0;

  function resaltarCoincidencias(texto, termino) {
    if (!termino) return texto;
    
    const textoNormalizado = normalizarTexto(texto);
    const terminoNormalizado = normalizarTexto(termino);

    const inicio = textoNormalizado.indexOf(terminoNormalizado);
    
    if (inicio === -1) return texto;
    
    const fin = inicio + termino.length;
    
    return (
      texto.substring(0, inicio) +
      '<span class="highlight">' +
      texto.substring(inicio, fin) +
      '</span>' +
      texto.substring(fin)
    );
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
      imgPrincipal.src = todasLasImagenes[currentImageIndex].replace('/upload/', '/upload/w_500,h_500,c_pad/');
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
          imgPrincipal.src = todasLasImagenes[currentImageIndex].replace(
            '/upload/', 
            '/upload/w_500,h_500,c_pad/' 
          );
          counter.textContent = `${currentImageIndex + 1}/${todasLasImagenes.length}`;
        });
        navControls.appendChild(prevBtn);

        const nextBtn = document.createElement("button");
        nextBtn.className = "image-nav-btn next";
        nextBtn.innerHTML = '<i class="bx bx-chevron-right"></i>';
        nextBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          currentImageIndex = (currentImageIndex + 1) % todasLasImagenes.length;
          imgPrincipal.src = todasLasImagenes[currentImageIndex].replace(
            '/upload/', 
            '/upload/w_500,h_500,c_pad/' 
          );
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
          src: url.replace('/upload/', '/upload/w_800,h_800,c_limit/'),
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

  function normalizarTexto(texto) {
    if (!texto) return '';
    
    return texto
      .toLowerCase()
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ü/g, 'u')
      .replace(/ñ/g, 'n');
  }

  function buscarLibros(terminoBusqueda) {
    const contenedor = document.getElementById("libros-container");
    const tituloCategoria = document.getElementById("titulo-categoria");
    const terminoOriginal = terminoBusqueda ? terminoBusqueda.trim() : ''; 
    const termino = terminoOriginal ? normalizarTexto(terminoOriginal) : ''; 

    if (!allBooksGlobal || allBooksGlobal.length === 0) {
      contenedor.innerHTML = '<div class="loading">Cargando libros...</div>';
      return;
    }

    if (termino) {
      contenedor.innerHTML = '<div class="loading">Buscando...</div>';

      setTimeout(() => { 
        const autoresExactos = allBooksGlobal
          .filter(libro => normalizarTexto(libro.autor) === termino) 
          .map(libro => libro.autor);
        
        if (autoresExactos.length > 0) {
          const autor = autoresExactos[0];
          const librosAutor = allBooksGlobal.filter(libro => libro.autor === autor);
         
          tituloCategoria.textContent = `LIBROS DE ${autor.toUpperCase()}`;
          contenedor.innerHTML = '';
          
          librosAutor.forEach(libro => {
            const div = document.createElement("div");
            div.className = "libro";           
            
            const imgPrincipal = document.createElement("img");
            imgPrincipal.src = libro.imagen_url.replace('/upload/', '/upload/w_500,h_500,c_fill/');
            imgPrincipal.alt = libro.titulo;
            imgPrincipal.loading = "lazy";
            div.appendChild(imgPrincipal);
            
            const tituloLibro = document.createElement("h3");
            tituloLibro.textContent = libro.titulo;
            div.appendChild(tituloLibro);
            
            const categoria = document.createElement("p");
            categoria.innerHTML = `<strong>Categoría:</strong> ${libro.categoria}`;
            div.appendChild(categoria);
            
            const precio = document.createElement("p");
            precio.innerHTML = `<strong>Precio:</strong> $${libro.precio.toFixed(2)}`;
            div.appendChild(precio);
            
            contenedor.appendChild(div);
          });
          return;
        }

        const librosFiltrados = allBooksGlobal.filter(libro => {
          const titulo = normalizarTexto(libro.titulo);
          const autor = normalizarTexto(libro.autor);
          return titulo.includes(termino) || autor.includes(termino);
        });

        if (librosFiltrados.length > 0) {
          const categoriaDelLibro = librosFiltrados[0].categoria;
          
          if (currentCategory !== categoriaDelLibro) {
            currentCategory = categoriaDelLibro;
            const nombreCategoria = categoriaDelLibro.replace(/-/g, ' ');
            
            window.history.pushState({}, '', `?categoria=${categoriaDelLibro}`);
            tituloCategoria.textContent = nombreCategoria.toUpperCase();
            
            contenedor.innerHTML = `
              <div class="category-alert success">
                <p>🔍 <strong>Libro encontrado en la categoría "${nombreCategoria}"</strong></p>
              </div>
            `;
            
            const librosEnCategoria = librosFiltrados.filter(libro => libro.categoria === categoriaDelLibro);
            renderizarLibros(librosEnCategoria);
          } else {
            tituloCategoria.textContent = currentCategory.replace(/-/g, ' ').toUpperCase();
            renderizarLibros(librosFiltrados);
          }
        } else {
          contenedor.innerHTML = `
            <div class="category-alert warning">
              <p>No se encontraron libros que coincidan con "${terminoOriginal}"</p>
              ${currentCategory ? `<a href="#" id="search-all-link">Buscar en todas las categorías</a>` : ''}
            </div>
          `;
          
          const searchAllLink = document.getElementById("search-all-link");
          if (searchAllLink) {
            searchAllLink.addEventListener("click", (e) => {
              e.preventDefault();
              currentCategory = null;
              window.history.pushState({}, '', window.location.pathname);
              tituloCategoria.textContent = "RESULTADOS DE BÚSQUEDA";
              buscarLibros(terminoOriginal); 
            });
          }
        }
      }, 100);
    } else {
      if (currentCategory) {
        cargarLibrosPorCategoria(currentCategory);
      } else {
        contenedor.innerHTML = "<p>Explora nuestros libros usando el buscador o selecciona una categoría.</p>";
      }
    }
  }

  async function cargarLibrosPorCategoria(categoria) {
    currentCategory = categoria;
    const titulo = document.getElementById("titulo-categoria");
    titulo.textContent = categoria.replace(/-/g, " ").toUpperCase();

    if (allBooksGlobal.length === 0) {
      await cargarTodosLosLibros();
    }

    const librosCategoria = allBooksGlobal.filter(libro => libro.categoria === categoria);
    
    if (librosCategoria.length === 0) {
      document.getElementById("libros-container").innerHTML = 
        `<p>Todavía no hay libros en ${categoria.replace(/-/g, ' ')}😟.</p>`;
    } else {
      renderizarLibros(librosCategoria);
    }
  }

  async function cargarTodosLosLibros() {
    try {
      const { db, firestore } = window.firebaseData;
      const q = firestore.query(firestore.collection(db, "libros"));
      const querySnapshot = await firestore.getDocs(q);
      allBooksGlobal = querySnapshot.docs.map(doc => doc.data());
      console.log("Total de libros cargados:", allBooksGlobal.length);
    } catch (error) {
      console.error("Error cargando todos los libros:", error);
      throw error;
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

    if (images.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
    }

    modalImg.src = images[startIndex].src;
    modalImg.style.display = "block";
    modalImg.style.maxWidth = "70%";
    modalImg.style.maxHeight = "85vh";
    modalImg.style.minWidth = "400px";
    captionText.textContent = images[startIndex].alt;
    modal.style.display = "flex";
    
    function isMobileDevice() {
      return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    function setupZoom() {
      if (isMobileDevice()) {
        return; 
      }
      
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
      zoomArea.style.pointerEvents = 'none';
      
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

      zoomContainer.addEventListener('mouseenter', (e) => {
          if (isMouseInValidArea(e)) {
              isMouseInArea = true;
              activateZoom();
          }
      });
      
      zoomContainer.addEventListener('mousemove', (e) => {
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
      
      zoomContainer.addEventListener('mouseleave', (e) => {
          const rect = zoomContainer.getBoundingClientRect();
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

    const newPrevBtn = prevBtn.cloneNode(true);
    const newNextBtn = nextBtn.cloneNode(true);
    prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

    newPrevBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      showImage(currentImgIndex - 1);
    }, { capture: true });
    
    newNextBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      showImage(currentImgIndex + 1);
    }, { capture: true });

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
  
  function mostrarSugerencias(termino) {
    const container = document.getElementById("suggestions-container");
    container.innerHTML = '';
    
    if (!termino || termino.length < 2 || allBooksGlobal.length === 0) {
      container.style.display = 'none';
      return;
    }
    
    const terminoLower = normalizarTexto(termino);
    const sugerencias = [];
    const autoresEncontrados = new Set();

    allBooksGlobal.forEach(libro => {
      const autorNormalizado = normalizarTexto(libro.autor);
      
      if (autorNormalizado.includes(terminoLower)) {
        autoresEncontrados.add(libro.autor);
      }
    });

    Array.from(autoresEncontrados).forEach(autor => {
      const totalLibros = allBooksGlobal.filter(l => l.autor === autor).length;
      
      sugerencias.push({
        displayText: `📚 Ver todos los libros de ${autor} (${totalLibros})`,
        searchText: autor,
        type: 'author-all',
        originalData: { autor }
      });
    });

    allBooksGlobal.forEach(libro => {
      const tituloNormalizado = normalizarTexto(libro.titulo);
      const autorNormalizado = normalizarTexto(libro.autor);

      if (tituloNormalizado.includes(terminoLower) && 
          !autoresEncontrados.has(libro.autor)) {
        
        sugerencias.push({
          displayText: `${libro.titulo} - ${libro.autor}`,
          searchText: libro.titulo,
          type: 'book',
          originalData: libro
        });
      }
    });

    const sugerenciasOrdenadas = sugerencias.sort((a, b) => {
      if (a.type === 'author-all' && b.type !== 'author-all') return -1;
      if (a.type !== 'author-all' && b.type === 'author-all') return 1;
      return 0;
    }).slice(0, 8);
    
    if (sugerenciasOrdenadas.length === 0) {
      container.style.display = 'none';
      return;
    }

    sugerenciasOrdenadas.forEach((sugerencia, index) => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.dataset.index = index;
 
      if (sugerencia.type === 'author-all') {
        const autor = sugerencia.originalData.autor;
        const matchStart = normalizarTexto(autor).indexOf(terminoLower);
        const matchEnd = matchStart + termino.length;
        
        const autorResaltado = 
          autor.substring(0, matchStart) +
          '<span class="highlight">' + 
          autor.substring(matchStart, matchEnd) + 
          '</span>' +
          autor.substring(matchEnd);
        
        div.innerHTML = `📚 Libros de ${autorResaltado}`;
      } else {
        const libro = sugerencia.originalData;
        const tituloMatch = normalizarTexto(libro.titulo).indexOf(terminoLower);
        const autorMatch = normalizarTexto(libro.autor).indexOf(terminoLower);
        
        if (tituloMatch !== -1) {
          const tituloResaltado = 
            libro.titulo.substring(0, tituloMatch) +
            '<span class="highlight">' + 
            libro.titulo.substring(tituloMatch, tituloMatch + termino.length) + 
            '</span>' +
            libro.titulo.substring(tituloMatch + termino.length);
          
          div.innerHTML = `${tituloResaltado} - ${libro.autor}`;
        } else {
          const autorResaltado = 
            libro.autor.substring(0, autorMatch) +
            '<span class="highlight">' + 
            libro.autor.substring(autorMatch, autorMatch + termino.length) + 
            '</span>' +
            libro.autor.substring(autorMatch + termino.length);
          
          div.innerHTML = `${libro.titulo} - ${autorResaltado}`;
        }
      }
      
      div.addEventListener("click", () => {
        document.getElementById("search-input").value = sugerencia.searchText;
        
        if (sugerencia.type === 'author-all') {
          mostrarVistaAutor(sugerencia.originalData.autor);
        } else {
          buscarLibros(sugerencia.searchText);
        }
        
        container.style.display = 'none';
      });
      
      container.appendChild(div);
    });
    
    container.style.display = 'block';
  }

  function mostrarVistaAutor(autor) {
    const contenedor = document.getElementById("libros-container");
    const tituloCategoria = document.getElementById("titulo-categoria");
    
    const librosAutor = allBooksGlobal.filter(libro => libro.autor === autor);
    
    tituloCategoria.textContent = `LIBROS DE ${autor.toUpperCase()}`;
    contenedor.innerHTML = '';
    
    if (librosAutor.length === 0) {
      contenedor.innerHTML = `<p>No se encontraron libros de ${autor}.</p>`;
      return;
    }

    renderizarLibros(librosAutor);
  }

  function configurarBusqueda() {
    const searchInput = document.getElementById("search-input");
    const searchButton = document.getElementById("search-button");
    const suggestionsContainer = document.getElementById("suggestions-container");
    const searchContainer = document.querySelector(".search-container");

    searchInput.addEventListener("input", (e) => {
      clearTimeout(window.searchTimeout);
      const termino = e.target.value.trim();
      
      mostrarSugerencias(termino);

      window.searchTimeout = setTimeout(() => {
        buscarLibros(termino);
      }, 350);
    });

    searchInput.addEventListener("focus", () => {
      if (searchInput.value.trim()) {
        mostrarSugerencias(searchInput.value.trim());
      }
    });

    searchInput.addEventListener("keydown", (e) => {
      const items = suggestionsContainer.querySelectorAll(".suggestion-item");
      const activeItem = suggestionsContainer.querySelector(".highlighted");
      
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = activeItem ? 
          (parseInt(activeItem.dataset.index) + 1) % items.length : 0;
        highlightSuggestion(items, nextIndex);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = activeItem ? 
          (parseInt(activeItem.dataset.index) - 1 + items.length) % items.length : items.length - 1;
        highlightSuggestion(items, prevIndex);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeItem) {
          activeItem.click();
        } else {
          buscarLibros(searchInput.value.trim());
        }
      }
    });

    searchButton.addEventListener("click", () => {
      buscarLibros(searchInput.value.trim());
      suggestionsContainer.style.display = 'none';
    });

    document.addEventListener("click", (e) => {
      if (!searchContainer.contains(e.target)) {
        suggestionsContainer.style.display = 'none';
      }
    });
  }

  function highlightSuggestion(items, index) {
    items.forEach(item => item.classList.remove("highlighted"));
    if (items[index]) {
      items[index].classList.add("highlighted");
      items[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  try {
    await cargarTodosLosLibros();
    configurarBusqueda();
    
    const params = new URLSearchParams(window.location.search);
    const categoria = params.get("categoria");
    const terminoBusqueda = params.get("busqueda");
    
    if (terminoBusqueda) {
      document.getElementById("search-input").value = terminoBusqueda;
      buscarLibros(terminoBusqueda);
    } else if (categoria) {
      await cargarLibrosPorCategoria(categoria);
    } else {
      document.getElementById("libros-container").innerHTML = 
        "<p>Explora nuestros libros usando el buscador o selecciona una categoría.</p>";
    }
  } catch (error) {
    console.error("Error inicializando:", error);
    document.getElementById("libros-container").innerHTML = 
      `<p class="error">Error al cargar los libros. <button onclick="location.reload()">Reintentar</button></p>`;
  }
});