const fs = require('fs');
const path = require('path');

let allowedDomains = [];

try {
  const domainsJson = fs.readFileSync(path.join(__dirname, '../data/email_domains.json'), 'utf-8');
  const domainData = JSON.parse(domainsJson);

  const allDomains = Object.values(domainData).flat();
  allowedDomains = [...new Set(allDomains)];
  //console.log('Dominios cargados correctamente:', allowedDomains);
} catch (error) {
  //console.error('Error al cargar los dominios:', error);
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const localPartRegex = /^[a-zA-Z0-9]+([._-]?[a-zA-Z0-9]+)*$/;

function validateEmailDomain(req, res, next) {
  const email = req.body.email;

  if (!email || typeof email !== 'string') {
    //console.warn('Email no proporcionado o no es una cadena válida.');
    return res.status(400).json({ error: 'Email inválido o no proporcionado.' });
  }

  if (!emailRegex.test(email)) {
   // console.warn(`Formato de email inválido: ${email}`);
    return res.status(400).json({ error: 'Formato de email inválido.' });
  }

  const [localPart, domain] = email.toLowerCase().split('@');

  if (
    localPart.length < 3 ||
    localPart.length > 64 ||
    !localPartRegex.test(localPart) ||
    localPart.startsWith('.') ||
    localPart.endsWith('.') ||
    localPart.includes('..') ||
    localPart.includes('__') ||
    localPart.includes('--')
  ) {
   // console.warn(`Parte local del correo no válida: ${localPart}`);
    return res.status(400).json({
      error: 'La parte antes del @ del correo no es válida. Revisa caracteres, longitud o símbolos.'
    });
  }

  if (!allowedDomains.includes(domain)) {
   // console.warn(`Dominio no permitido: ${domain}`);
    return res.status(400).json({
      error: `Dominio de correo no permitido: ${domain}`
    });
  }

  next();
}

module.exports = validateEmailDomain;
