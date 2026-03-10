const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sanitizeHtml = require('sanitize-html');
const cloudinary = require("../config/cloudinary");
const Notification = require("../models/Notification");
const socketNotification = require("../sockets/socketNotification");




exports.register = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    const existe = await User.findOne({ email });
    if (existe) return res.status(400).json({ msg: "El usuario ya existe" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const nuevoUsuario = new User({ nombre, email, password: hashedPassword });

    await nuevoUsuario.save();

    res.status(201).json({ msg: "Usuario creado correctamente" });
    // console.log("Nuevo usuario registrado:", nuevoUsuario._id);
  } catch (err) {
    //console.error("Error al registrar usuario:", err);
    res.status(500).json({ msg: "Error en el servidor" });
  }
};


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const usuario = await User.findOne({ email });
    if (!usuario) return res.status(400).json({ msg: "Credenciales inválidas" });

    const valido = await bcrypt.compare(password, usuario.password);
    if (!valido) return res.status(400).json({ msg: "Credenciales inválidas" });

    const token = jwt.sign({ id: usuario._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token, usuario });
    //console.log("Usuario autenticado:", usuario._id);
  } catch (err) {
    // console.error("Error al iniciar sesión:", err);
    res.status(500).json({ msg: "Error al iniciar sesión" });
  }
};


exports.getProfile = async (req, res) => {
  try {
    const usuario = await User.findById(req.user.id).select("-password");
    res.json(usuario);
    // console.log("Perfil obtenido:", usuario);
  } catch (err) {
    // console.error("Error al obtener perfil:", err);
    res.status(500).json({ msg: "Error al obtener perfil" });
  }
};



exports.updateUser = async (req, res) => {
  try {
    const datos = req.body;
    if (datos.password) {
      datos.password = await bcrypt.hash(datos.password, 10);
    }

    const usuario = await User.findByIdAndUpdate(req.user.id, datos, { new: true });
    res.json(usuario);
    // console.log("Usuario actualizado:", usuario);
  } catch (err) {
    // console.error("Error al actualizar usuario:", err);
    res.status(500).json({ msg: "Error al actualizar usuario" });
  }
};


exports.deleteUser = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ msg: "Contraseña incorrecta" });
    }

    await User.findByIdAndDelete(req.user.id);
    res.json({ msg: "Usuario eliminado" });
    // console.log("Usuario eliminado:", req.user.id);
  } catch (err) {
    // console.error("Error al eliminar usuario:", err);
    res.status(500).json({ msg: "Error al eliminar usuario" });
  }
};



exports.buscarUsuarios = async (req, res) => {
  try {
    const { search } = req.query;
    const usuarioId = req.user._id;

    if (!search || !search.trim()) {
      // console.log("Parámetro 'search' no proporcionado");
      return res.status(400).json({ message: "El parámetro 'search' es obligatorio" });
    }

    const regex = new RegExp(search.trim(), "i");

    const usuarioActual = await User.findById(usuarioId).select("bloqueados");

    const usuarios = await User.find({
      $and: [
        { _id: { $ne: usuarioId } },
        { _id: { $nin: usuarioActual.bloqueados } },
        {
          $or: [
            { nombre: regex },
            { email: regex },
            { username: regex },
          ],
        },
      ],
    }).select("_id nombre email username fotoPerfil");

    res.json(usuarios);
    // console.log("Usuarios encontrados:", usuarios);
  } catch (error) {
    // console.error("Error en buscarUsuarios:", error);
    res.status(500).json({ message: "Error del servidor" });
  }
};





exports.userSearch = async (req, res) => {
  try {
    const { search } = req.query;
    const userId = req.user?.id;

    if (!search || search.trim() === "") {
      return res.status(400).json({ message: "Debe proporcionar un término de búsqueda." });
    }

    const regex = new RegExp(search.trim(), "i");

    const usuarioActual = await User.findById(userId).select("bloqueados");

    const usuarios = await User.find({
      $or: [{ nombre: regex }, { username: regex }],
      _id: {
        $nin: [...usuarioActual.bloqueados, userId],
      },
    }).select("nombre username fotoPerfil");

    res.json(usuarios);
    // console.log("Usuarios encontrados:", usuarios);
  } catch (error) {
    // console.error("Error buscando usuarios:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};




exports.getUsers = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const userId = req.user.id;

    const usuarioActual = await User.findById(userId).select("bloqueados");


    const usuarios = await User.find({
      _id: { $ne: userId },
      bloqueados: { $ne: userId },
      _id: { $nin: usuarioActual.bloqueados },
    }).select("-password nombre username email fotoPerfil");

    res.json(usuarios);
    // console.log("Usuarios obtenidos:", usuarios);
  } catch (error) {
    // console.error("Error obteniendo usuarios:", error);
    res.status(500).json({ message: "Error obteniendo usuarios" });
  }
};



exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const usuarioActual = await User.findById(userId).select("bloqueados");

    const user = await User.findById(id)
      .select("-password")
      .populate("seguidores", "nombre username fotoPerfil")
      .populate("siguiendo", "nombre username fotoPerfil");

    if (!user) {
      return res.status(404).json({ msg: "Usuario no encontrado." });
    }

    if (user._id.toString() === userId) {
      return res.json(user);
    }

    const bloqueadoPorUsuarioActual = usuarioActual.bloqueados
      .map(id => id.toString())
      .includes(user._id.toString());

    const consultado = await User.findById(user._id).select("bloqueados");

    const bloqueadoPorConsultado = consultado.bloqueados
      .map(id => id.toString())
      .includes(userId);

    if (bloqueadoPorUsuarioActual || bloqueadoPorConsultado) {
      //console.log(`Usuario ${userId} no puede ver el perfil de ${id} debido a un bloqueo.`);
      return res.status(403).json({ msg: "No puedes ver este perfil debido a un bloqueo." });
    }

    res.json(user);
    //console.log("Perfil de usuario obtenido:", user._id);
  } catch (error) {
    // console.error("Error al obtener usuario por ID:", error);
    res.status(500).json({ msg: "Error del servidor." });
  }
};








exports.getUsuariosAleatorios = async (req, res) => {
  try {
    const userId = req.user.id;

    const usuarioActual = await User.findById(userId).select("bloqueados");


    const usuarios = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId, $nin: usuarioActual.bloqueados },
          bloqueados: { $ne: userId },
        },
      },
      { $sample: { size: 10 } },
      {
        $project: {
          _id: 1,
          nombre: 1,
          username: 1,
          fotoPerfil: 1,
          seguidores: 1,
        },
      },
    ]);

    res.json(usuarios);
    // console.log("Usuarios aleatorios obtenidos:", usuarios);
  } catch (err) {
    // console.error("Error al obtener usuarios aleatorios:", err);
    res.status(500).json({ error: "Error al obtener usuarios aleatorios" });
  }
};



exports.actualizarPerfil = async (req, res) => {
  const { nombre, passwordActual, passwordNueva, bio, ubicacion, sitioWeb } = req.body;
  const userId = req.user.id;

  try {
    const usuario = await User.findById(userId);
    if (!usuario) {
      // console.log(`Usuario ${userId} intentó actualizar su perfil pero no existe.`);
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    if (nombre && nombre !== usuario.nombre) {
      const sanitizedNombre = sanitizeHtml(nombre, {
        allowedTags: [],
        allowedAttributes: {},
      });

      if (!sanitizedNombre) {
        // console.log(`Usuario ${userId} intentó actualizar su perfil con un nombre vacío.`);
        return res.status(400).json({ mensaje: 'El nombre no puede estar vacío' });
      }

      const ahora = new Date();
      const puedeCambiarNombre =
        !usuario.ultimaModificacionNombre ||
        (ahora - usuario.ultimaModificacionNombre) >= 15 * 24 * 60 * 60 * 1000;

      if (!puedeCambiarNombre) {
        // console.log(`Usuario ${userId} intentó cambiar su nombre antes de 15 días.`);
        return res.status(400).json({ mensaje: 'Solo puedes cambiar tu nombre cada 15 días' });
      }

      const nombreExistente = await User.findOne({
        nombre: { $regex: `^${sanitizedNombre}$`, $options: 'i' },
        _id: { $ne: userId },
      });
      if (nombreExistente) {
        //console.log(`Usuario ${userId} intentó actualizar su perfil con un nombre ya existente: ${sanitizedNombre}`);
        return res.status(400).json({ mensaje: 'Ese nombre ya está en uso' });
      }

      usuario.nombre = sanitizedNombre;
      usuario.ultimaModificacionNombre = ahora;
    }

    if (passwordActual && passwordNueva) {
      if (passwordNueva.length < 8) {
        // console.log(`Usuario ${userId} intentó actualizar su perfil con una contraseña corta.`);
        return res.status(400).json({ mensaje: 'La nueva contraseña debe tener al menos 8 caracteres' });
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(passwordNueva)) {
        // console.log(`Usuario ${userId} intentó actualizar su perfil con una contraseña débil.`);
        return res.status(400).json({
          mensaje: 'La contraseña debe incluir mayúsculas, minúsculas, números y caracteres especiales',
        });
      }

      const coincide = await bcrypt.compare(passwordActual, usuario.password);
      if (!coincide) {
        // console.log(`Usuario ${userId} intentó actualizar su perfil con una contraseña incorrecta.`);
        return res.status(401).json({ mensaje: 'Contraseña actual incorrecta' });
      }

      usuario.password = await bcrypt.hash(passwordNueva, 10);
    }

    if (req.body.configuracionStatus) {
      usuario.configuracionStatus = {
        ...usuario.configuracionStatus,
        ...req.body.configuracionStatus
      };
    }

    if (bio !== undefined) usuario.bio = bio;
    if (ubicacion !== undefined) usuario.ubicacion = ubicacion;
    if (sitioWeb !== undefined) usuario.sitioWeb = sitioWeb;

    if (!nombre && (!passwordActual || !passwordNueva) && !req.body.configuracionStatus && bio === undefined && ubicacion === undefined && sitioWeb === undefined) {
      return res.status(400).json({ mensaje: 'Debes proporcionar al menos un campo para actualizar' });
    }

    await usuario.save();

    res.json({
      mensaje: 'Perfil actualizado correctamente',
      nombre: usuario.nombre,
      bio: usuario.bio,
      ubicacion: usuario.ubicacion,
      sitioWeb: usuario.sitioWeb,
      createdAt: usuario.createdAt
    });

    // console.log('Perfil actualizado:', usuario._id);
  } catch (error) {
    // console.error('Error actualizando perfil:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};













exports.uploadPhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const user = await User.findById(userId);
    if (user.fotoPublicId) {
      await cloudinary.uploader.destroy(user.fotoPublicId);
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "perfiles",
      width: 300,
      height: 300,
      crop: "limit",
    });


    user.fotoPerfil = result.secure_url;
    user.fotoPublicId = result.public_id;
    await user.save();

    res.json({ fotoPerfil: user.fotoPerfil });
    //console.log("Foto de perfil subida:", user.fotoPerfil);
  } catch (error) {
    // console.error("Error al subir la foto:", error);
    res.status(500).json({ message: "Error subiendo la foto" });
  }
};

exports.uploadCoverPhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const user = await User.findById(userId);
    if (user.fotoPortadaPublicId) {
      await cloudinary.uploader.destroy(user.fotoPortadaPublicId);
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "portadas",
      width: 1200,
      height: 400,
      crop: "fill",
    });

    user.fotoPortada = result.secure_url;
    user.fotoPortadaPublicId = result.public_id;
    await user.save();

    res.json({ fotoPortada: user.fotoPortada });
  } catch (error) {
    res.status(500).json({ message: "Error subiendo la foto de portada" });
  }
};


exports.deletePhoto = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    if (user.fotoPublicId) {
      await cloudinary.uploader.destroy(user.fotoPublicId);
    }

    user.fotoPerfil = "";
    user.fotoPublicId = "";
    await user.save();

    res.json({ message: "Foto de perfil eliminada" });
    //console.log("Foto de perfil eliminada:", userId);
  } catch (error) {
    //console.error("Error al eliminar la foto de perfil:", error);
    res.status(500).json({ message: "Error eliminando foto" });
  }
};

exports.deleteCoverPhoto = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    if (user.fotoPortadaPublicId) {
      await cloudinary.uploader.destroy(user.fotoPortadaPublicId);
    }

    user.fotoPortada = "";
    user.fotoPortadaPublicId = "";
    await user.save();

    res.json({ message: "Foto de portada eliminada" });
  } catch (error) {
    res.status(500).json({ message: "Error eliminando foto de portada" });
  }
};












exports.bloquearUsuario = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (userId === id) {
      return res.status(400).json({ msg: "No puedes bloquearte a ti mismo." });
    }

    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ msg: "Usuario no encontrado." });

    if (user.bloqueados.includes(id)) {
      // console.log(`Usuario ${userId} ya bloqueó a ${id}`);
      return res.status(400).json({ msg: "Usuario ya bloqueado." });
    }

    user.bloqueados.push(id);
    await user.save();

    res.json({ msg: "Usuario bloqueado correctamente." });
    // console.log(`Usuario ${userId} bloqueó a ${id}`);
  } catch (error) {
    //console.error("Error al bloquear usuario:", error);
    res.status(500).json({ msg: "Error en el servidor." });
  }
};


exports.obtenerUsuariosBloqueados = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate("bloqueados", "nombre username email fotoPerfil");

    if (!user) return res.status(404).json({ msg: "Usuario no encontrado." });

    res.json(user.bloqueados);
    //console.log("Usuarios bloqueados obtenidos:", user.bloqueados);
  } catch (error) {
    // console.error("Error al obtener bloqueados:", error);
    res.status(500).json({ msg: "Error en el servidor." });
  }
};


exports.desbloquearUsuario = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (userId === id) {
      //console.log(`Usuario ${userId} intentó desbloquearse a sí mismo.`);
      return res.status(400).json({ msg: "No puedes desbloquearte a ti mismo." });
    }

    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ msg: "Usuario no encontrado." });
    // console.log(`Usuario ${userId} intenta desbloquear a ${id}`);

    const index = user.bloqueados.indexOf(id);
    if (index === -1) {
      return res.status(400).json({ msg: "Ese usuario no está bloqueado." });
    }

    user.bloqueados.splice(index, 1);
    await user.save();

    res.json({ msg: "Usuario desbloqueado correctamente." });
    // console.log(`Usuario ${userId} desbloqueó a ${id}`);
  } catch (error) {
    // console.error("Error al desbloquear usuario:", error);
    res.status(500).json({ msg: "Error en el servidor." });
  }
};











exports.seguirUsuario = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (userId === id) {
      return res.status(400).json({ msg: "No puedes seguirte a ti mismo." });
    }

    const usuarioActual = await User.findById(userId);
    const usuarioASeguir = await User.findById(id);

    if (!usuarioASeguir) {
      return res.status(404).json({ msg: "Usuario no encontrado." });
    }

    if (usuarioActual.siguiendo.includes(id)) {
      return res.status(400).json({ msg: "Ya estás siguiendo a este usuario." });
    }

    usuarioActual.siguiendo.push(id);
    usuarioASeguir.seguidores.push(userId);

    await usuarioActual.save();
    await usuarioASeguir.save();

    const noti = new Notification({
      emisor: userId,
      receptor: id,
      mensaje: `${usuarioActual.username || "Alguien"} te empezó a seguir.`,
      tipo: "sistema",
    });
    await noti.save();

    const io = socketNotification.getIO();
    io.to(id).emit("nueva-notificacion", {
      _id: noti._id,
      emisor: userId,
      receptor: id,
      mensaje: noti.mensaje,
      tipo: "sistema",
      leido: false,
      createdAt: noti.createdAt,
    });

    res.json({ msg: "Usuario seguido correctamente." });

  } catch (error) {
    // console.error("Error al seguir usuario:", error);
    res.status(500).json({ msg: "Error del servidor." });
  }
};



exports.dejarDeSeguirUsuario = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const usuarioActual = await User.findById(userId);
    const usuarioASeguir = await User.findById(id);

    if (!usuarioASeguir) {
      // console.log(`Usuario ${userId} intentó dejar de seguir a un usuario inexistente: ${id}`);
      return res.status(404).json({ msg: "Usuario no encontrado." });
    }

    usuarioActual.siguiendo = usuarioActual.siguiendo.filter(uid => uid.toString() !== id);
    usuarioASeguir.seguidores = usuarioASeguir.seguidores.filter(uid => uid.toString() !== userId);

    await usuarioActual.save();
    await usuarioASeguir.save();

    res.json({ msg: "Has dejado de seguir al usuario." });
    // console.log(`Usuario ${userId} dejó de seguir a ${id}.`);
  } catch (error) {
    // console.error("Error al dejar de seguir usuario:", error);
    res.status(500).json({ msg: "Error del servidor." });
  }
};


exports.obtenerSiguiendo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("siguiendo", "nombre username fotoPerfil");
    res.json(user.siguiendo);
    // console.log("Usuarios seguidos obtenidos:", user.siguiendo);
  } catch (error) {
    // console.error("Error obteniendo seguidos:", error);
    res.status(500).json({ msg: "Error del servidor." });
  }
};


exports.obtenerSeguidores = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("seguidores", "nombre username fotoPerfil");
    res.json(user.seguidores);
    // console.log("Seguidores obtenidos:", user.seguidores);
  } catch (error) {
    // console.error("Error obteniendo seguidores:", error);
    res.status(500).json({ msg: "Error del servidor." });
  }
};





