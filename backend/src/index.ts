import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSchema, type AuthChecker } from 'type-graphql';
import { CalendarSlotResolver } from './resolvers';
import { DataSource } from 'typeorm';
import { GraphQLError } from 'graphql';
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
}

export const adminAuthChecker: AuthChecker<Context> = ({ context: { token } }) => {
  return (token === Bun.env.ADMIN_TOKEN);
};

const schema = await buildSchema({
  resolvers: [CalendarSlotResolver],
  authChecker: adminAuthChecker
});

const server = new ApolloServer({
  schema,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req, res }) => {
    return { token: req.headers.authorization };
  }
});

console.log(`🚀  Server ready at: ${url}`);