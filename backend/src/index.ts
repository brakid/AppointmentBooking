import { ApolloServer } from '@apollo/server';
import { startStandaloneServer, type StandaloneServerContextFunctionArgument } from '@apollo/server/standalone';
import { buildSchema, type AuthChecker } from 'type-graphql';
import { AppointmentResolver, CalendarSlotResolver, CustomerResolver } from './resolvers';
import { DataSource } from 'typeorm';
import { Roles, type Context } from './types';
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
  if (roles[0] === Roles.ADMIN) {
    return context.isAdmin;
  }
  if (roles[0] === Roles.CUSTOMER) {
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

const contextHandler = async ({ req }: StandaloneServerContextFunctionArgument): Promise<Context> => {
  const authorizationHeader = req.headers.authorization || '';
  if (authorizationHeader.startsWith('Bearer')) {
    const decodedToken = decodeToken(authorizationHeader.replace('Bearer ', ''));
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

const { url } = await startStandaloneServer(
  server, 
  {
    context: contextHandler
  }
);

console.log(`🚀 Server ready at ${url}`);