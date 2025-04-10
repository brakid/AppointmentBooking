import { ApolloServer } from '@apollo/server';
import { type StandaloneServerContextFunctionArgument } from '@apollo/server/standalone';
import { buildSchema, type AuthChecker } from 'type-graphql';
import { AppointmentResolver, CalendarSlotResolver, CustomerResolver } from './resolvers';
import { DataSource } from 'typeorm';
import { Roles, type Context } from './types';
import { decodeToken } from './token';
import cors from 'cors';
import express from 'express';
import http from 'http';
import { expressMiddleware } from '@apollo/server/express4';
import { initializePaymentListener } from './paymentlistener';

const authChecker: AuthChecker<Context> =  ({ context }, roles): boolean => {
  if (roles.length === 0 || roles.length > 1) { // invalid case
    return false;
  }
  if (roles[0] === Roles.ADMIN) {
    return context.isAdmin;
  }
  if (roles[0] === Roles.CUSTOMER) {
    return !!context.customerId;
  }
  return false;
};

const contextHandler = async ({ req }: StandaloneServerContextFunctionArgument): Promise<Context> => {
  const authorizationHeader = req.headers.authorization || '';
  if (authorizationHeader.startsWith('Bearer')) {
    const decodedToken = decodeToken(authorizationHeader.replace('Bearer ', ''));
    return {
      customerId: decodedToken.customerId,
      isAdmin: false
    };
  } else {
    return {
      isAdmin: (authorizationHeader === Bun.env.ADMIN_TOKEN)
    };
  }
};

const dataSource = new DataSource({
  type: 'sqlite',
  database: Bun.env.DATABASE || '',
  entities: ['./src/types.ts'],
  logging: true,
  synchronize: true,
});

try {
  await dataSource.initialize();
  console.log('Data Source initialized!');
  await initializePaymentListener();
  console.log('Payment Listener initialized');
} catch (err) {
  console.error('Error during initialization:', err);
  process.exit();
}

const schema = await buildSchema({
  resolvers: [CustomerResolver, CalendarSlotResolver, AppointmentResolver],
  authChecker
});

const app = express();
const httpServer = http.createServer(app);
const server = new ApolloServer({
  schema,
});
await server.start();

app.use(
  '/',
  cors<cors.CorsRequest>(),
  express.json(),
  expressMiddleware(server, {
    context: contextHandler,
  }),
);

await new Promise<void>((resolve) =>
  httpServer.listen({ port: 4000 }, resolve),
);
console.log(`🚀 Server ready at http://localhost:4000/`);