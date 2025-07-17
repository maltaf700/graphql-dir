import { gql } from "graphql-tag";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export const typeDefs = gql`
  directive @auth(role: String) on OBJECT | FIELD_DEFINITION

  type Dashboard @auth(role: "ADMIN,SUPERADMIN") {
    id: ID!
    title: String!
    description: String
    isActive: Boolean @auth(role: "SUPERADMIN")
    owner: String @auth(role: "ADMIN,SUPERADMIN")
  }

  input CreateDashboardInput {
    title: String!
    description: String
  }

  input UpdateDashboardInput {
    id: ID!
    title: String
    description: String
  }

  type Query {
    dashboards: [Dashboard]! @auth(role: "ADMIN,SUPERADMIN")
    dashboard(id: ID!): Dashboard @auth(role: "ADMIN,SUPERADMIN")
  }

  type Mutation {
    login(email: String!): String
    createDashboard(input: CreateDashboardInput!): Dashboard
      @auth(role: "SUPERADMIN")
    updateDashboard(input: UpdateDashboardInput!): Dashboard
      @auth(role: "SUPERADMIN")
    deleteDashboard(id: ID!): Boolean @auth(role: "SUPERADMIN")
  }
`;

export const resolvers = {
  Query: {
    dashboards: async () => {
      return prisma.dashboard.findMany();
    },
    dashboard: async (_: any, { id }: any) => {
      return prisma.dashboard.findUnique({ where: { id } });
    },
  },

  Mutation: {
    login: async (_: any, { email }: any, context: any) => {
      const role =
        email === "super@admin.com"
          ? "SUPERADMIN"
          : email === "admin@admin.com"
          ? "ADMIN"
          : "USER";

      const token = jwt.sign(
        { email, role },
        process.env.JWT_SECRET || "secret",
        { expiresIn: "1h" }
      );

      // ✅ Send token as HttpOnly cookie
      context.res.cookie("token", token, {
        httpOnly: true,
        secure: false, // set to true in production
        sameSite: "lax",
        maxAge: 60 * 60 * 1000, // 1 hour
      });

      return "Login successful";
    },
    createDashboard: async (_: any, { input }: any, context: any) => {
      return prisma.dashboard.create({
        data: {
          title: input.title,
          description: input.description || null,
          owner: context.user?.email || "unknown",
        },
      });
    },

    updateDashboard: async (_: any, { input }: any) => {
      return prisma.dashboard.update({
        where: { id: input.id },
        data: {
          ...(input.title && { title: input.title }),
          ...(input.description && { description: input.description }),
        },
      });
    },

    deleteDashboard: async (_: any, { id }: any) => {
      const deleted = await prisma.dashboard.delete({ where: { id } });
      return !!deleted;
    },
  },
};
