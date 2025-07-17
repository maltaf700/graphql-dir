import { Request, Response } from "express";
import { ExpressContextFunctionArgument } from "@apollo/server/express4";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

interface User {
  email: string;
  role: string;
}

export interface Context {
  user?: User;
  req: Request;
  res: Response;
}

export const createContext = async ({
  req,
}: ExpressContextFunctionArgument): Promise<Context> => {
  // req.res is not typed by default, so we cast it
  const res = (req as Request & { res: Response }).res;

  const token = req.cookies?.token;

  if (token) {
    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET || "secret"
      ) as User;

      return {
        user: {
          email: payload.email,
          role: payload.role.toUpperCase(),
        },
        req,
        res,
      };
    } catch (err) {
      console.warn("Invalid or expired token:", err);
    }
  }

  return { req, res };
};
