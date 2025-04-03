import express from 'express';
import { ApolloServer } from '@apollo/server';
import { buildSchema, type AuthChecker } from 'type-graphql';
import { AppointmentResolver, CalendarSlotResolver, CustomerResolver } from './resolvers';
import { DataSource } from 'typeorm';
import { ADMIN, USER, type Context } from './types';
import { expressMiddleware, type ExpressContextFunctionArgument } from '@apollo/server/express4';
import { decodeToken } from './token';

export const dataSource = new DataSource({
  type: 'sqlite',
  database: Bun.env.DATABASE || '',
  entities: ['./src/types.ts'],
  logging: true,
  synchronize: true,
})

try {
  await dataSource.initialize();
  console.log('Data Source has been initialized!');
} catch (err) {
  console.error('Error during Data Source initialization:', err);
  process.exit();
}

export const authChecker: AuthChecker<Context> =  ({ context }, roles): boolean => {
  if (roles.length === 0 || roles.length > 1) { // invalid case
    return false;
  }
  if (roles[0] === ADMIN) {
    return context.isAdmin;
  }
  if (roles[0] === USER) {
    return !!context.customerId;
  }
  return false;
};

const schema = await buildSchema({
  resolvers: [CustomerResolver, CalendarSlotResolver, AppointmentResolver],
  authChecker
});

const server = new ApolloServer({
  schema,
});
await server.start();

const contextHandler = async ({ req }: ExpressContextFunctionArgument): Promise<Context> => {
  const authorizationHeader = req.headers.authorization || '';
  console.log(authorizationHeader);
  if (authorizationHeader.startsWith('Bearer')) {
    const decodedToken = decodeToken(authorizationHeader);
    return {
      customerId: decodedToken.customerId,
      isAdmin: false
    };
  } else {
    if (authorizationHeader === Bun.env.ADMIN_TOKEN) {
      return {
        isAdmin: true
      };
    } else {
      return {
        isAdmin: false
      };
    }
  }
}

const app = express();
app.use('/',
  express.json({ limit: '50mb' }),
  expressMiddleware(server, { context: contextHandler })
);

app.listen({ port: 4000 }, () =>
  console.log(`🚀 Server ready at http://localhost:4000`),
);