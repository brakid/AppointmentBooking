import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSchema, type AuthChecker } from 'type-graphql';
import { AppointmentResolver, CalendarSlotResolver, CustomerResolver } from './resolvers';
import { DataSource } from 'typeorm';
import type { Context } from './types';

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

export const adminAuthChecker: AuthChecker<Context> =  ({ context }): boolean => {
  return (context.token === Bun.env.ADMIN_TOKEN);
};

const schema = await buildSchema({
  resolvers: [CustomerResolver, CalendarSlotResolver, AppointmentResolver],
  authChecker: adminAuthChecker
});

const server = new ApolloServer({
  schema,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }): Promise<Context> => {
    return { token: req.headers.authorization };
  }
});

console.log(`🚀  Server ready at: ${url}`);