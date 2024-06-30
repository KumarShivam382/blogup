import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { decode, sign, verify } from "hono/jwt";
import { postRouter } from "./routes/post";
import { userRouter } from "./routes/user";

export const app = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET_KEY: string;
  };
}>();

app.get("/", async (c) => {
  return c.text("Hello Hono!");
});

app.route("/user", userRouter);
app.route("/post", postRouter);

export default app;
