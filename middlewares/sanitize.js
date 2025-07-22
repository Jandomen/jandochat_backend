const sanitize = require('mongo-sanitize');

function sanitizeInputs(req, res, next) {
  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);
  next();
}

module.exports = sanitizeInputs;
