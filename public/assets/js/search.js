// assets/js/search.js - Versión para nav-search-container
document.addEventListener("DOMContentLoaded", async () => {
  let allBooksGlobal = [];

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

  async function cargarTodosLosLibros() {
    try {
      if (window.firebaseData && window.firebaseData.db && window.firebaseData.firestore) {
        const { db, firestore } = window.firebaseData;
        const q = firestore.query(firestore.collection(db, "libros"));
        const querySnapshot = await firestore.getDocs(q);
        allBooksGlobal = querySnapshot.docs.map(doc => doc.data());
        console.log("Libros cargados para búsqueda:", allBooksGlobal.length);
        return allBooksGlobal;
      } else {
        console.warn("Firebase no está inicializado");
        return [];
      }
    } catch (error) {
      console.error("Error cargando libros para búsqueda:", error);
      return [];
    }
  }

  function mostrarSugerencias(termino) {
    const container = document.getElementById("suggestions-container");
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!termino || termino.length < 2 || allBooksGlobal.length === 0) {
      container.style.visibility = 'hidden';
      container.style.opacity = '0';
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
      container.style.visibility = 'hidden';
      container.style.opacity = '0';
      return;
    }

    sugerenciasOrdenadas.forEach((sugerencia, index) => {
      const div = document.createElement("div");
      div.className = "suggestion-item";
      div.dataset.index = index;

      if (sugerencia.type === 'author-all') {
        div.setAttribute('data-type', 'author-all');
      }
 
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
        const searchInput = document.getElementById("search-input");
        if (searchInput) {
          searchInput.value = sugerencia.searchText;
        }

        if (sugerencia.type === 'author-all') {
          window.location.href = `libros.html?busqueda=${encodeURIComponent(sugerencia.originalData.autor)}`;
        } else {
          window.location.href = `libros.html?busqueda=${encodeURIComponent(sugerencia.searchText)}`;
        }
        
        container.style.visibility = 'hidden';
        container.style.opacity = '0';
      });
      
      container.appendChild(div);
    });

    container.style.visibility = 'visible';
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';
  }

  function highlightSuggestion(items, index) {
    items.forEach(item => item.classList.remove("highlighted"));
    if (items[index]) {
      items[index].classList.add("highlighted");
      items[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function buscarLibros(termino) {
    const terminoBusqueda = termino ? termino.trim() : '';
    
    if (terminoBusqueda && terminoBusqueda.length > 0) {
      window.location.href = `libros.html?busqueda=${encodeURIComponent(terminoBusqueda)}`;
    } else {
      window.location.href = 'libros.html';
    }
  }

  function configurarBusqueda() {
    const searchInput = document.getElementById("search-input");
    const searchButton = document.getElementById("search-button");
    const suggestionsContainer = document.getElementById("suggestions-container");
    const searchContainer = document.querySelector(".nav-search-container");
    
    if (!searchInput || !searchButton) {
      console.warn("Elementos de búsqueda no encontrados en esta página");
      return;
    }
    
    if (!searchContainer) {
      console.warn("⚠️ nav-search-container no encontrado");
      return;
    }

    searchInput.addEventListener("input", (e) => {
      clearTimeout(window.searchTimeout);
      const termino = e.target.value.trim();
      
      mostrarSugerencias(termino);

      window.searchTimeout = setTimeout(() => {
      }, 350);
    });

    searchInput.addEventListener("focus", () => {
      if (searchInput.value.trim()) {
        mostrarSugerencias(searchInput.value.trim());
      }
    });

    searchInput.addEventListener("keydown", (e) => {
      const items = suggestionsContainer?.querySelectorAll(".suggestion-item");
      if (!items || items.length === 0) return;
      
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
      } else if (e.key === "Escape") {
        if (suggestionsContainer) {
          suggestionsContainer.style.visibility = 'hidden';
          suggestionsContainer.style.opacity = '0';
        }
      }
    });

    searchButton.addEventListener("click", () => {
      buscarLibros(searchInput.value.trim());
      if (suggestionsContainer) {
        suggestionsContainer.style.visibility = 'hidden';
        suggestionsContainer.style.opacity = '0';
      }
    });

    document.addEventListener("click", (e) => {
      if (searchContainer && !searchContainer.contains(e.target)) {
        if (suggestionsContainer) {
          suggestionsContainer.style.visibility = 'hidden';
          suggestionsContainer.style.opacity = '0';
        }
      }
    });
  }

  async function inicializarBusqueda() {
    try {
      const MAX_WAIT_TIME = 10000;
      const CHECK_INTERVAL = 100;
      let timeWaited = 0;
      
      await new Promise((resolve, reject) => {
        const checkFirebase = () => {
          if (window.firebaseData && window.firebaseData.db && window.firebaseData.firestore) {
            console.log("Firebase listo para búsqueda");
            resolve();
          } else if (timeWaited >= MAX_WAIT_TIME) {
            console.warn("Timeout esperando Firebase, configurando búsqueda sin datos");
            resolve();
          } else {
            timeWaited += CHECK_INTERVAL;
            setTimeout(checkFirebase, CHECK_INTERVAL);
          }
        };
        checkFirebase();
      });

      await cargarTodosLosLibros();

      configurarBusqueda();
      
      console.log("Barra de búsqueda inicializada correctamente");
    } catch (error) {
      console.error("Error inicializando búsqueda:", error);
      configurarBusqueda();
    }
  }
  
  inicializarBusqueda();
});