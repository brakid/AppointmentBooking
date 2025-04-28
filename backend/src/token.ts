import { sign, verify } from 'jsonwebtoken';
import type { Token } from './types';
import { type UUID } from 'crypto';
import { GraphQLError } from 'graphql';

export const decodeToken = (token: string): Token | undefined => {
  try {
    return JSON.parse(JSON.stringify(verify(token, Bun.env.SECRET || '', { algorithms: ['HS512'] }))) as Token;
  } catch (err) {
    if (JSON.stringify(err).includes('TokenExpiredError')) {
      return undefined;
    }
    throw new GraphQLError(JSON.stringify(err));
  }
};

export const generateToken = (customerId: UUID): string => {
  try {
    const token: Token =  { customerId };
    return sign(token, Bun.env.SECRET || '', { algorithm: 'HS512', expiresIn: '2Days' });
  } catch (err) {
    throw new GraphQLError(JSON.stringify(err));
  }
};