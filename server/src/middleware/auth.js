import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }

    const user = await User.findById(decoded.id).select('_id name email');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }

    req.userId = user._id.toString();
    req.user = user;
    next();
  } catch (error) { // eslint-disable-line no-unused-vars
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
};

export default protect;

