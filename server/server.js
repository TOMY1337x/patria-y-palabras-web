const path = require('path');
require('dotenv').config({ path: '../.env' });
const express = require('express');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY_JSON);


initializeApp({
  credential: cert(serviceAccount)
});

const app = express();

const requiredEnvVars = [
  'ADMIN_FRONTEND_URL',
  'PUBLIC_FRONTEND_URLS',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_SECRET_KEY',
  'FIREBASE_SERVICE_ACCOUNT',
  'NODE_ENV',
  'FIREBASE_PUBLIC_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD'
];

requiredEnvVars.forEach(variable => {
  if (!process.env[variable]) {
    throw new Error(`Falta la variable ${variable} en .env`);
  }
});

const dynamicCors = (req, callback) => {
  let corsOptions;

  if (req.path.startsWith('/api/firebase-client-config') || 
      req.path.startsWith('/health')) {
    corsOptions = { 
      origin: true, 
      methods: ['GET', 'OPTIONS'],
      optionsSuccessStatus: 200
    };
  } 
  else {
    corsOptions = {
      origin: process.env.ADMIN_FRONTEND_URL,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      optionsSuccessStatus: 200
    };
  }
  
  callback(null, corsOptions);
};

app.use(cors(dynamicCors));
app.options('*', cors(dynamicCors));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: 'Demasiadas solicitudes desde esta IP, por favor intente más tarde'
});

if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log('Solicitud recibida:', req.method, req.path);
    next();
  });
}

app.use(express.json());

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY
});

const verificarAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Formato de token inválido',
        solution: 'Incluye el token como Bearer token'
      });
    }

    const idToken = authHeader.split(' ')[1].trim();
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const isAuthorizedAdmin = decodedToken.email === process.env.ADMIN_EMAIL;
    
    if (!isAuthorizedAdmin) {
      await getAuth().revokeRefreshTokens(decodedToken.uid);
      return res.status(403).json({ 
        success: false, 
        error: 'Acceso no autorizado',
        action: 'Tokens de refresco revocados'
      });
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      authTime: new Date(decodedToken.auth_time * 1000)
    };

    next();
  } catch (error) {
    console.error('Error en verificarAdmin:', error);
    
    const response = {
      success: false,
      error: 'Error de autenticación',
      code: error.code || 'UNKNOWN_ERROR'
    };

    if (process.env.NODE_ENV === 'development') {
      response.details = error.message;
      response.stack = error.stack;
    }

    res.status(403).json(response);
  }
};

app.get('/api/firebase-client-config', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
    
    try {
        const config = {
            apiKey: process.env.FIREBASE_PUBLIC_API_KEY?.trim() || (() => { throw new Error('FIREBASE_PUBLIC_API_KEY no configurada') })(),
            authDomain: process.env.FIREBASE_AUTH_DOMAIN?.trim() || (() => { throw new Error('FIREBASE_AUTH_DOMAIN no configurada') })(),
            projectId: process.env.FIREBASE_PROJECT_ID?.trim() || (() => { throw new Error('FIREBASE_PROJECT_ID no configurada') })(),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET?.trim() || '',
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID?.trim() || '',
            appId: process.env.FIREBASE_APP_ID?.trim() || (() => { throw new Error('FIREBASE_APP_ID no configurada') })()
        };

        if (process.env.NODE_ENV === 'production') {
            res.set('Cache-Control', 'public, max-age=3600');
        }
        
        res.json(config);
        
    } catch (error) {
        console.error('Error en configuración Firebase:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error de configuración',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/api/cloudinary-config', verificarAdmin, (req, res) => {
  console.log('Solicitud recibida en /api/cloudinary-config'); 
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      throw new Error('Configuración de Cloudinary incompleta');
    }
    
    res.json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET,
      cropping: false,
      multiple: true,
      maxFiles: 5,
      clientAllowedFormats: ['jpg', 'png', 'gif', 'webp']
    });
  } catch (error) {
    console.error('Error en cloudinary-config:', error);
    res.status(500).json({ 
      success: false,
      error: error.message
    });
  }
});

app.post('/api/eliminar-imagenes', verificarAdmin, async (req, res) => {
  console.log('Solicitud de eliminación recibida:', req.body); 
  
  try {
    const { public_ids } = req.body;
    
    if (!public_ids || !Array.isArray(public_ids)) {
      return res.status(400).json({ 
        success: false,
        error: 'Se requiere un array de public_ids válido' 
      });
    }

    const validIds = public_ids.filter(id => id && typeof id === 'string');
    
    if (validIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No se proporcionaron IDs válidos para eliminar' 
      });
    }

    const deletionResults = await Promise.all(
      validIds.map(public_id => 
        cloudinary.uploader.destroy(public_id, {
          invalidate: true,
          resource_type: 'image'
        })
      )
    );

    const failedDeletions = deletionResults.filter(r => r.result !== 'ok');
    
    if (failedDeletions.length > 0) {
      console.error('Algunas imágenes no se eliminaron:', failedDeletions);
      return res.status(207).json({
        success: false,
        error: 'Algunas imágenes no se pudieron eliminar',
        details: failedDeletions
      });
    }

    res.json({ 
      success: true,
      message: 'Imágenes eliminadas correctamente',
      count: validIds.length
    });
    
  } catch (error) {
    console.error('Error al eliminar imágenes:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.delete('/api/eliminar-libro', verificarAdmin, async (req, res) => {
  try {
    const { libroId } = req.body;
    
    if (!libroId) {
      return res.status(400).json({ 
        success: false,
        error: 'Se requiere el ID del libro' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Libro marcado para eliminación',
      libroId
    });
  } catch (error) {
    console.error('Error al eliminar libro:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

app.post('/api/assign-admin', verificarAdmin, async (req, res) => {
  try {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ 
        success: false,
        error: 'Se requiere el UID del usuario' 
      });
    }

    await getAuth().setCustomUserClaims(uid, { admin: true });
    
    res.json({ 
      success: true,
      message: 'Privilegios de admin asignados correctamente'
    });
  } catch (error) {
    console.error('Error en assign-admin:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

app.get('/api/verify-admin', verificarAdmin, async (req, res) => {
  try {
    const isAdmin = req.user.email === process.env.ADMIN_EMAIL;
    
    res.json({
      isAdmin,
      shouldAssignRole: process.env.NODE_ENV === 'development',
      email: isAdmin ? req.user.email : undefined
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Error al verificar privilegios'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ 
    success: false,
    error: 'Error interno del servidor'
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\nServidor corriendo en puerto ${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV}`);
  console.log(`Orígenes permitidos: ${process.env.ADMIN_FRONTEND_URL}`);
  console.log(`Endpoint de salud: http://localhost:${PORT}/health\n`);
});