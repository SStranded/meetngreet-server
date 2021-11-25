const allowedOrigins = ['localhost', '192.168.50.29']; //list of allowed domains

module.exports = (req, res, next) => {
  let ip =
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;

  ip = ip.replace(/^.*:/, '');

  let isDomainAllowed = allowedOrigins.indexOf(ip) !== -1;

  if (!isDomainAllowed)
    return res.status(403).json({
      message: 'Access Restricted',
    });
  next();
};
