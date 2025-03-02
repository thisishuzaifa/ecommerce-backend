import jwt from 'jsonwebtoken';

export const generateTestToken = (userId: number = 1) => {
  return jwt.sign(
    { 
      id: userId,
      email: 'test@example.com',
      role: 'user'
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

export const getAuthHeader = (userId?: number) => {
  const token = generateTestToken(userId);
  return { Authorization: `Bearer ${token}` };
};
