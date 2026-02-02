import { app } from '../../../firebase/firebase-config.js';
import { auth, onAuthStateChanged, signOut } from '../../../firebase/firebase-auth.js';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  deleteDoc,
  updateDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const API_BASE_URL =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001'
    : 'https://patriaypalabras-backend.onrender.com';

const libroForm = document.getElementById('libro-form');
const btnSubirImagen = document.getElementById('btn-subir-imagen');
const previewImage = document.getElementById('preview-image');
const mensaje = document.getElementById('mensaje');
const listaLibros = document.getElementById('lista-libros');
const nombreArchivo = document.getElementById('nombre-archivo');
const btnGuardar = document.querySelector('#libro-form button[type="submit"]');
let libroEditando = null;

let cloudinaryWidget;
let imagenesURLs = [];
let imagenesPublicIds = [];

let todosLosLibros = [];
let librosFiltrados = [];

async function initializeCloudinary() {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuario no autenticado. Por favor, inicia sesión.');
    }
    
    const token = await user.getIdToken();
    const apiUrl = `${API_BASE_URL}/api/cloudinary-config`;

    console.log('Solicitando configuración a:', apiUrl); 
    
    const response = await fetch(apiUrl, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include' 
    });
    
    console.log('Respuesta recibida:', response.status); 
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    const config = await response.json();
    console.log('Configuración recibida:', config); 
    
    return cloudinary.createUploadWidget(config, (error, result) => {
      if (error) {
        console.error('Error en Cloudinary Widget:', error);
        mostrarMensaje('error', 'Error al subir imagen');
        return;
      }
      
      if (result && result.event === 'success') {
        imagenesURLs = [...(imagenesURLs || []), result.info.secure_url];
        imagenesPublicIds = [...(imagenesPublicIds || []), result.info.public_id];
        actualizarPrevisualizacion();
        nombreArchivo.textContent = `${imagenesURLs.length} imágenes seleccionadas`;
        mostrarMensaje('success', '¡Imagen subida correctamente!');
      }
    });
  } catch (error) {
    console.error('Error en initializeCloudinary:', error);
    mostrarMensaje('error', `Error de configuración: ${error.message}`);
    throw error; 
  }
}

btnSubirImagen.addEventListener('click', async (e) => {
  e.preventDefault();
  try {
    if (!cloudinaryWidget) {
      console.log('Inicializando widget...'); 
      cloudinaryWidget = await initializeCloudinary();
      console.log('Widget inicializado:', cloudinaryWidget ? 'Éxito' : 'Falló'); 
    }
    
    if (cloudinaryWidget) {
      cloudinaryWidget.open();
    } else {
      throw new Error('No se pudo inicializar el widget de Cloudinary');
    }
  } catch (error) {
    console.error('Error al abrir Cloudinary:', error);
    mostrarMensaje('error', `Error: ${error.message}`);
  }
});

function actualizarPrevisualizacion() {
  const previewContainer = document.getElementById('preview-container');
  if (!previewContainer) return;

  previewContainer.innerHTML = '';

  if (!imagenesURLs || imagenesURLs.length === 0) {
    previewContainer.style.display = 'none';
    return;
  }

  imagenesURLs.forEach((url, index) => {
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'preview-thumbnail';

    const img = document.createElement('img');
    img.src = url;
    img.alt = `Imagen ${index + 1}`;

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.className = 'remove-image-btn';
    removeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      eliminarImagen(index);
    };

    imgWrapper.appendChild(img);
    imgWrapper.appendChild(removeBtn);
    previewContainer.appendChild(imgWrapper);
  });

  previewContainer.style.display = 'flex';
}

async function eliminarImagen(index) {
  try {
    if (!confirm('¿Eliminar esta imagen permanentemente? Esta acción no se puede deshacer.')) {
      return;
    }
    
    mostrarMensaje('warning', "Eliminando imagen...");
    
    const publicIdToDelete = imagenesPublicIds[index];
    if (!publicIdToDelete) {
      throw new Error('ID de imagen no válido');
    }

    const token = await getAuthToken();
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    const apiUrl = `${API_BASE_URL}/api/eliminar-imagenes`;

    console.log('Enviando solicitud a:', apiUrl); 
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        public_ids: [publicIdToDelete] 
      })
    });

    console.log('Respuesta del servidor:', response.status); 
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'No se pudo eliminar la imagen');
    }

    imagenesURLs.splice(index, 1);
    imagenesPublicIds.splice(index, 1);

    actualizarPrevisualizacion();
    nombreArchivo.textContent = imagenesURLs.length > 0 
      ? `${imagenesURLs.length} imágenes seleccionadas` 
      : 'Ninguna imagen seleccionada';

    mostrarMensaje('success', "Imagen eliminada correctamente");
    
  } catch (error) {
    console.error("Error al eliminar imagen:", error);
    mostrarMensaje('error', `Error: ${error.message}`);

    if (imagenesURLs.length !== imagenesPublicIds.length) {
      imagenesURLs = [...imagenesURLs];
      imagenesPublicIds = [...imagenesPublicIds];
      actualizarPrevisualizacion();
    }
  }
}

async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado');
  return await user.getIdToken();
}

async function asignarRolAdmin() {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const token = await user.getIdToken();
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    const apiUrl = `${API_BASE_URL}/api/assign-admin`;

    console.log('Enviando petición a:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ uid: user.uid })
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${await response.text()}`);
    }

    console.log('Rol admin asignado correctamente');
    await user.getIdToken(true);
  } catch (error) {
    console.error('Error al asignar rol admin:', error);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log('No hay usuario, redirigiendo a login');
    window.location.href = "../login/login.html";
    return;
  }

  try {
    const token = await user.getIdToken(true);

    const response = await fetch(`${API_BASE_URL}/api/verify-admin`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Error verificando admin:', response.status);
      mostrarMensaje(
        'error',
        'No se pudo verificar el acceso. Intenta nuevamente.'
      );
      return; 
    }

    const data = await response.json();

    if (!data.isAdmin) {
      console.log('Usuario sin permisos admin');
      await signOut(auth);
      window.location.href = "../login/login.html";
      return;
    }

    console.log('Admin verificado correctamente');

    if (data.shouldAssignRole) {
      await asignarRolAdmin();
    }

  } catch (error) {
    console.error('Error de red verificando admin:', error);
    mostrarMensaje(
      'error',
      'Error de conexión con el servidor'
    );

  }
});


document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await signOut(auth);
    window.location.href = "../login/login.html";
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
    alert("Ocurrió un error al cerrar sesión");
  }
});

function mostrarMensaje(tipo, texto) {
  mensaje.textContent = texto;
  mensaje.style.display = 'block';
  mensaje.className = 'alert';
  
  switch(tipo) {
    case 'success':
      mensaje.classList.add('alert-success');
      break;
    case 'error':
      mensaje.classList.add('alert-error');
      break;
    case 'warning':
      mensaje.classList.add('alert-warning');
      break;
  }
  
  setTimeout(() => {
    mensaje.style.display = 'none';
  }, 5000);
}

async function cargarLibros() {
  try {
    listaLibros.innerHTML = '<div class="loading"><i class="fas fa-spinner"></i> Cargando lista de libros...</div>';
    
    const db = getFirestore(app);
    const querySnapshot = await getDocs(collection(db, "libros"));
    
    if (querySnapshot.empty) {
      listaLibros.innerHTML = '<p>No hay libros registrados.</p>';
      return;
    }
    
    todosLosLibros = querySnapshot.docs.map(doc => {
      const data = doc.data();  // 
      return {
        id: doc.id,
        ...data,
        fecha: data.fecha?.toDate() || new Date(),
        titulo_norm: data.titulo_norm || normalizarTexto(data.titulo),
        autor_norm: data.autor_norm || normalizarTexto(data.autor)
      };
    })
    
    aplicarFiltros();
    actualizarOpcionesCategorias();
  } catch (error) {
    console.error("Error al cargar libros:", error);
    mostrarMensaje('error', `Error al cargar libros: ${error.message}`);
  }
}

function aplicarFiltros() {
  const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
  const categoriaSeleccionada = document.getElementById('filtro-categoria')?.value || '';
  const ordenSeleccionado = document.getElementById('filtro-orden')?.value || 'reciente';
  const hayBusquedaOFiltro =
    searchTerm !== '' ||
    categoriaSeleccionada !== '';

  librosFiltrados = todosLosLibros.filter(libro => {
    const matchesSearch = 
      libro.titulo.toLowerCase().includes(searchTerm) || 
      libro.autor.toLowerCase().includes(searchTerm);
    
    const matchesCategory = 
      !categoriaSeleccionada || 
      libro.categoria === categoriaSeleccionada;
    
    return matchesSearch && matchesCategory;
  });
  
  switch(ordenSeleccionado) {
    case 'reciente':
      librosFiltrados.sort((a, b) => b.fecha - a.fecha);
      break;
    case 'antiguo':
      librosFiltrados.sort((a, b) => a.fecha - b.fecha);
      break;
    case 'precio-asc':
      librosFiltrados.sort((a, b) => a.precio - b.precio);
      break;
    case 'precio-desc':
      librosFiltrados.sort((a, b) => b.precio - a.precio);
      break;
  }

  if (!hayBusquedaOFiltro) {
    librosFiltrados = librosFiltrados.slice(0, 10);
  }

  mostrarLibrosFiltrados();
}

function mostrarLibrosFiltrados() {
  if (librosFiltrados.length === 0) {
    listaLibros.innerHTML = '<p>No se encontraron libros que coincidan con los filtros.</p>';
    return;
  }
  
  listaLibros.innerHTML = '';
  
  librosFiltrados.forEach(libro => {
    const libroElement = document.createElement('div');
    libroElement.className = 'libro-item';
    
    const categoriaFormateada = libro.categoria
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const comision = (libro.precio * 0.6).toFixed(2);
    const precioFormateado = libro.precio.toFixed(2);
    
    const todasLasImagenes = libro.imagenes_urls || [libro.imagen_url];
    
    let imagenesHTML = '';
    if (todasLasImagenes.length > 1) {
      imagenesHTML = `
        <div class="libro-carousel">
          <div class="main-image">
            <img src="${transformarURLImagen(todasLasImagenes[0])}" alt="${libro.titulo}" loading="lazy">
          </div>
          <div class="carousel-controls">
            <button class="carousel-prev" onclick="cambiarImagen(this, -1)">❮</button>
            <div class="thumbnails">
              ${todasLasImagenes.map((img, index) => `
                <img src="${transformarURLImagen(img, true)}" 
                     alt="Miniatura ${index + 1}" 
                     onclick="mostrarImagen(this, '${transformarURLImagen(img)}')"
                     class="${index === 0 ? 'active' : ''}">
              `).join('')}
            </div>
            <button class="carousel-next" onclick="cambiarImagen(this, 1)">❯</button>
          </div>
        </div>
      `;
    } else {
      imagenesHTML = `
        <div class="libro-images">
          <img src="${transformarURLImagen(todasLasImagenes[0])}" alt="${libro.titulo}" loading="lazy">
        </div>
      `;
    }
    
    libroElement.innerHTML = `
      <div class="libro-header">
        <div>
          <h3>${libro.titulo}</h3>
          <span class="libro-categoria">${categoriaFormateada}</span>
        </div>
        <div class="libro-actions">
          <button onclick="editarLibro('${libro.id}')" class="button-outline button-sm">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button onclick="eliminarLibro('${libro.id}')" class="button-danger button-sm">
            <i class="fas fa-trash"></i> Eliminar
          </button>
        </div>
      </div>
      <div class="libro-body">
        ${imagenesHTML}
        <div class="libro-info">
          <p><strong>Autor:</strong> ${libro.autor}</p>
          <p><strong>Precio:</strong> $${precioFormateado}</p>
          <p><strong>Estado:</strong> ${libro.estado.charAt(0).toUpperCase() + libro.estado.slice(1)}</p>
          ${libro.descripcion ? `<p><strong>Descripción:</strong> ${libro.descripcion}</p>` : ''}
          <div class="libro-comision">
            <strong>Nos quedamos el 60%:</strong> <span class="monto">$${comision}</span>
          </div>
          <p><small>Agregado: ${libro.fecha.toLocaleDateString()}</small></p>
        </div>
      </div>
    `;
    
    listaLibros.appendChild(libroElement);
  });
}

function transformarURLImagen(url, thumbnail = false) {
  if (!url) return '';

  if (url.includes('/upload/')) {
    return thumbnail
      ? url.replace('/upload/', '/upload/w_100,h_100,c_fill/')
      : url.replace('/upload/', '/upload/w_500,h_500,c_fill/');
  }

  return url;
}


window.mostrarImagen = function(element, fullImageUrl) {
  const mainImage = element.closest('.libro-carousel').querySelector('.main-image img');
  mainImage.src = fullImageUrl;
  
  element.closest('.thumbnails').querySelectorAll('img').forEach(img => {
    img.classList.remove('active');
  });
  element.classList.add('active');
};

window.cambiarImagen = function(button, direction) {
  const carousel = button.closest('.libro-carousel');
  const thumbnails = carousel.querySelectorAll('.thumbnails img');
  const currentIndex = Array.from(thumbnails).findIndex(img => img.classList.contains('active'));
  
  let newIndex = currentIndex + direction;
  if (newIndex < 0) newIndex = thumbnails.length - 1;
  if (newIndex >= thumbnails.length) newIndex = 0;
  
  mostrarImagen(thumbnails[newIndex], thumbnails[newIndex].getAttribute('src').replace('/w_100,h_100', '/w_500,h_500'));
};

function actualizarOpcionesCategorias() {
  const select = document.getElementById('filtro-categoria');
  if (!select) return;
  
  const categoriasUnicas = [...new Set(todosLosLibros.map(libro => libro.categoria))];
  
  select.innerHTML = '<option value="">Todas las categorías</option>';
  
  categoriasUnicas.forEach(categoria => {
    const nombreFormateado = categoria
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    const option = document.createElement('option');
    option.value = categoria;
    option.textContent = nombreFormateado;
    select.appendChild(option);
  });
}

window.eliminarLibro = async function(id) {
  if (!confirm("¿Estás seguro de eliminar este libro permanentemente?")) return;

  try {
    mostrarMensaje('warning', "Eliminando libro...");
    
    const user = auth.currentUser;
    if (!user) throw new Error('No hay usuario autenticado');
    
    const token = await getAuthToken();
    
    const db = getFirestore(app);
    const libroRef = doc(db, "libros", id);
    const libroSnap = await getDoc(libroRef);

    if (!libroSnap.exists()) throw new Error("El libro no existe");

    const libro = libroSnap.data();
    const publicIds = [
      libro.imagen_public_id,
      ...(libro.imagenes_public_ids || [])
    ].filter(Boolean);

    if (publicIds.length > 0) {
      const response = await fetch(`${API_BASE_URL}/api/eliminar-imagenes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ public_ids: [...new Set(publicIds)] })
      });

      if (!response.ok) throw new Error('Error al eliminar imágenes');
    }

    const deleteResponse = await fetch(`${API_BASE_URL}/api/eliminar-libro`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ libroId: id })
    });

    if (!deleteResponse.ok) throw new Error('Error al eliminar libro');

    await deleteDoc(libroRef);
    mostrarMensaje('success', "¡Libro eliminado correctamente!");
    await cargarLibros();

  } catch (error) {
    console.error("Error al eliminar libro:", error);
    mostrarMensaje('error', `Error: ${error.message.replace('Firebase: ', '')}`);
  }
};

window.editarLibro = async function(id) {
  try {
    mostrarMensaje('warning', "Cargando datos del libro...");
    
    const db = getFirestore(app);
    const docRef = doc(db, "libros", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const libro = docSnap.data();
      libroForm.titulo.value = libro.titulo;
      libroForm.autor.value = libro.autor;
      libroForm.estado.value = libro.estado;
      libroForm.categoria.value = libro.categoria;
      libroForm.precio.value = libro.precio;
      libroForm.descripcion.value = libro.descripcion || '';
      
      const previewContainer = document.getElementById('preview-container');
      previewContainer.innerHTML = '';
      
      imagenesURLs = [...(libro.imagenes_urls || [libro.imagen_url].filter(Boolean))];
      imagenesPublicIds = [...(libro.imagenes_public_ids || [libro.imagen_public_id].filter(Boolean))];
      
      actualizarPrevisualizacion();
      nombreArchivo.textContent = imagenesURLs.length > 1 
        ? `${imagenesURLs.length} imágenes seleccionadas`
        : '1 imagen seleccionada';
      
      libroEditando = id;
      btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
      mostrarMensaje('warning', "Editando libro. Realiza los cambios y guárdalos.");
      libroForm.scrollIntoView({ behavior: 'smooth' });
    } else {
      throw new Error("El libro no existe.");
    }
  } catch (error) {
    console.error("Error al editar libro:", error);
    mostrarMensaje('error', `Error: ${error.message}`);
  }
}

function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')                 
    .replace(/[\u0300-\u036f]/g, '')  
    .replace(/\s+/g, ' ')             
    .trim();
}


function existeLibroDuplicado(titulo, idExcluido = null) {
  const tituloNorm = normalizarTexto(titulo);

  return todosLosLibros.some(libro => {
    if (idExcluido && libro.id === idExcluido) return false;
    
    return libro.titulo_norm === tituloNorm;
  });
}

libroForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  mostrarMensaje('warning', 'Procesando...');

  try {
    if (!imagenesURLs || imagenesURLs.length === 0) {
      throw new Error("Debes subir al menos una imagen");
    }
    const db = getFirestore(app);
    const titulo = libroForm.titulo.value;
    const autor = libroForm.autor.value;
    const libroData = {
      titulo,
      autor,
      titulo_norm: normalizarTexto(titulo),
      autor_norm: normalizarTexto(autor),
      estado: libroForm.estado.value,
      categoria: libroForm.categoria.value,
      precio: parseFloat(libroForm.precio.value),
      descripcion: libroForm.descripcion.value,
      imagenes_urls: imagenesURLs,
      imagenes_public_ids: imagenesPublicIds,
      imagen_url: imagenesURLs[0],
      imagen_public_id: imagenesPublicIds[0],
    };
    
    if (libroEditando) {
      const duplicado = existeLibroDuplicado(
        libroData.titulo,
        libroEditando
      );
      
      if (duplicado) {
        mostrarMensaje('error', 'Ya existe otro libro con ese título');
        return;
      }

      const docRef = doc(db, "libros", libroEditando);
      const docSnap = await getDoc(docRef);

      libroData.fecha = docSnap.exists()
        ? docSnap.data().fecha
        : new Date();

      await updateDoc(docRef, libroData);
      mostrarMensaje('success', '¡Libro actualizado correctamente!');
    } else {
      libroData.fecha = new Date();

      const duplicado = existeLibroDuplicado(
        libroData.titulo,
        null  
      );

      if (duplicado) {
        mostrarMensaje('error', 'Ya existe un libro con el mismo título y autor');
        return;
      }

      await setDoc(doc(db, "libros", crypto.randomUUID()), libroData);
      mostrarMensaje('success', '¡Libro registrado correctamente!');
    }


    libroForm.reset();
    document.getElementById('preview-container').innerHTML = '';
    nombreArchivo.textContent = '';
    imagenesURLs = [];
    imagenesPublicIds = [];
    libroEditando = null;
    btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Libro';
    await cargarLibros();
  } catch (error) {
    console.error("Error al guardar libro:", error);
    mostrarMensaje('error', `Error: ${error.message}`);
  }
});

libroForm.addEventListener('reset', () => {
  document.getElementById('preview-container').innerHTML = '';
  nombreArchivo.textContent = '';
  imagenesURLs = [];
  imagenesPublicIds = [];
  libroEditando = null;
  btnGuardar.innerHTML = '<i class="fas fa-save"></i> Guardar Libro';
});

document.addEventListener('DOMContentLoaded', () => {
  cargarLibros();
  
  document.getElementById('search-input')?.addEventListener('input', aplicarFiltros);
  document.getElementById('filtro-categoria')?.addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-orden')?.addEventListener('change', aplicarFiltros);
});