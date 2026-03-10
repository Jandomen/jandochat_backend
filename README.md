# JandoChat Backend

API REST y servidor de WebSocket para la aplicación de chat en tiempo real JandoChat.

## 🌐 Servidor de Producción

El servidor de producción está desplegado en: **https://jandochat-backend.onrender.com**

## 🚀 Características

- **Autenticación**: JWT con bcrypt
- **Chat en tiempo real**: Socket.io
- **Base de datos**: MongoDB con Mongoose
- **Subida de archivos**: Cloudinary para imágenes/videos
- **Estados/Historias**: Sistema de estados con expiración
- **Publicaciones**: Posts con multimedia, reacciones y comentarios
- **Validación**: express-validator + sanitize-html
- **Rate limiting**: express-rate-limit

## 🛠️ Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Socket.io
- JWT + bcrypt
- Cloudinary
- Multer

## 📂 Estructura

```
jandochat_backend/
├── config/          # Configuración (db, cloudinary)
├── controllers/     # Lógica de negocio
├── db/              # Conexión a MongoDB
├── middlewares/     # Auth, validación, etc.
├── models/          # Modelos Mongoose
├── routes/          # Rutas API
├── sockets/         # Eventos Socket.io
├── utils/           # Utilidades
├── uploads/         # Archivos subidos temporalmente
└── server.js        # Entry point
```

## ⚙️ Configuración

Crear archivo `.env`:

```env
PORT=8000
MONGODB_URI=mongodb://localhost:27017/jandochat
JWT_SECRET=tu_secret_jwt
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

## 🚀 Ejecución

```bash
# Instalar dependencias
npm install

# Iniciar servidor
npm start
# o desarrollo
node server.js
```

El servidor corre en `http://localhost:8000`

## 📡 API Endpoints

### Auth
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/auth/perfil` - Perfil actual
- `PUT /api/auth/perfil` - Actualizar perfil

### Conversaciones
- `GET /api/conversaciones` - Listar conversaciones
- `POST /api/conversaciones` - Crear conversación
- `DELETE /api/conversaciones/:id` - Eliminar

### Mensajes
- `GET /api/mensajes/:conversacionId` - Mensajes de conversación
- `POST /api/mensajes` - Enviar mensaje

### Estados/Historias
- `GET /api/status` - Listar estados activos
- `POST /api/status` - Crear estado
- `DELETE /api/status/:id` - Eliminar estado
- `POST /api/status/:id/visto` - Marcar como visto
- `GET /api/status/:id/vistas` - Ver quienes vieron

### Publicaciones
- `GET /api/posts` - Feed de publicaciones
- `POST /api/posts` - Crear publicación
- `POST /api/posts/:id/reaccionar` - Reaccionar
- `POST /api/posts/:id/comentar` - Comentar
- `DELETE /api/posts/:id` - Eliminar

### Usuarios
- `GET /api/usuarios` - Listar usuarios
- `GET /api/usuarios/:id` - Perfil de usuario

## 🖥️ CLI de Terminal

También puedes usar JANDOCHAT desde la terminal con nuestro CLI oficial.

Ver documentación completa en: **[CLI](../CLI/README.md)**

---

© 2026 **Jandosoft** • *Digital Innovation Hub*
