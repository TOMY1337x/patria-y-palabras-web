import { 
  auth,
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
  signOut
} from '../../../firebase/firebase-auth.js';

const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');
const rememberCheckbox = document.getElementById('remember-me');
const togglePasswordBtn = document.getElementById('toggle-password');
const errorDisplay = document.getElementById('login-error');
const loginForm = document.getElementById('login-form');

(async function initLoginPage() {
  try {
    await signOut(auth);
  } catch (error) {
    console.log("No había sesión activa:", error.message);
  }

  loadCredentials();
  setupPasswordToggle();
})();

function loadCredentials() {
  const savedEmail = localStorage.getItem('adminEmail');
  const savedPassword = localStorage.getItem('adminPassword');
  const remember = localStorage.getItem('rememberAdmin') === 'true';
  
  if (remember && savedEmail && savedPassword) {
    emailInput.value = savedEmail;
    passwordInput.value = savedPassword;
    rememberCheckbox.checked = true;
    passwordInput.focus();
  }
}

function setupPasswordToggle() {
  togglePasswordBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    const icon = togglePasswordBtn.querySelector('i');
    if (icon) {
      icon.classList.toggle('fa-eye');
      icon.classList.toggle('fa-eye-slash');
    }
    passwordInput.focus();
  });
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = emailInput.value;
  const password = passwordInput.value;
  const remember = rememberCheckbox.checked;

   try {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdTokenResult();
    if (!token.claims.admin) {
      await signOut(auth);
      throw new Error("No tienes privilegios de administrador");
    }

    if (remember) {
      localStorage.setItem('adminEmail', email);
      localStorage.setItem('rememberAdmin', 'true');
    } else {
      localStorage.removeItem('adminEmail');
      localStorage.removeItem('rememberAdmin');
    }

    window.location.href = "../panel/admin.html";
    
  } catch (error) {
    errorDisplay.textContent = "Credenciales incorrectas o sin permisos";
    errorDisplay.style.display = 'block';
    console.error("Error de autenticación:", error);
  }
});