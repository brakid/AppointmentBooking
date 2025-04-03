import { sign, verify } from 'jsonwebtoken';
import type { Token } from './types';
import { type UUID } from 'crypto';

export const decodeToken = (token: string): Token => {
  return JSON.parse(JSON.stringify(verify(token.replace('Bearer ', ''), Bun.env.SECRET || '', { algorithms: ['HS512'] }))) as Token;
};

export const generateToken = (customerId: UUID): string => {
  const token: Token =  { customerId };
  return sign(token, Bun.env.SECRET || '', { algorithm: 'HS512', expiresIn: '2Days' })
};