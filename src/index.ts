import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDefs, resolvers } from "./schema";
import { authDirectiveTransformer } from "./directives/authDirective1";
import { createContext } from "./context/createContext";

dotenv.config();

async function start() {
  const app = express();

  // ✅ Allow cross-origin cookie access (important for frontend or Postman)
  app.use(
    cors({
      origin: "http://localhost:3000", // your frontend origin or Postman
      credentials: true, // ⬅️ enable cookies
    })
  );

  app.use(cookieParser()); // ✅ to read cookies from requests
  app.use(express.json()); // ✅ parse JSON requests

  let schema = makeExecutableSchema({ typeDefs, resolvers });
  schema = authDirectiveTransformer(schema);

  const server = new ApolloServer({ schema });
  await server.start();

  app.use(
    "/graphql",
    expressMiddleware(server, {
      context: createContext,
    })
  );

  app.listen(4000, () => {
    console.log("🚀 Server ready at http://localhost:4000/graphql");
  });
}

start();
