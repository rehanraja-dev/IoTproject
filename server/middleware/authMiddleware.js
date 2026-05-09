function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }

  if (req.method === 'GET' && req.accepts('html')) {
    return res.redirect('/login');
  }

  return res.status(401).json({
    success: false,
    message: 'Authentication required',
  });
}

function attachUser(req, res, next) {
  res.locals.user = req.session?.user || null;
  next();
}

module.exports = {
  requireAuth,
  attachUser,
};
