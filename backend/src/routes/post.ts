import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { verify, sign } from "hono/jwt";
import { z } from "zod";
import {
  CreateBlogInput,
  createBlogInput,
  updateBlogInput,
} from "@shivam_382/blogup-common";

export const postRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET_KEY: string;
  };
  Variables: {
    userId: string;
  };
}>();

postRouter.use("/*", async (c, next) => {
  const authHeader = c.req.header("Authorization") || "";
  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const token = authHeader.split(" ")[1];
  try {
    const user = await verify(token, c.env.JWT_SECRET_KEY);

    if (!user || typeof user.id !== "string") {
      return c.json({ error: "Unauthorized" }, 403);
    }
    c.set("userId", user.id);
    await next();
  } catch (error) {
    return c.json({ error: "Unauthorized" }, 403);
  }
});

postRouter.get("/:id", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const res = await prisma.post.findUnique({
      where: {
        id: c.req.param("id"),
      },
    });

    return c.json(res);
  } catch (err: unknown) {
    if (err instanceof Error) {
      return c.json({ error: err.message });
    } else {
      return c.json({ error: "An unknown error occurred" });
    }
  } finally {
    await prisma.$disconnect();
  }
});

postRouter.get("/blog/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const res = await prisma.post.findMany();
    return c.json(res);
  } catch (err: unknown) {
    if (err instanceof Error) {
      return c.json({ error: err.message });
    } else {
      return c.json({ error: "An unknown error occurred" });
    }
  } finally {
    await prisma.$disconnect();
  }
});

postRouter.post("/blog", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  const userId = c.get("userId");
  const body = await c.req.json();
  const { success } = createBlogInput.safeParse(body);
  if (!success) {
    c.status(411);
    return c.json({ error: "Invalid input" });
  }

  try {
    const post = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: userId,
      },
    });

    return c.json({ id: post.id });
  } catch (error) {
    console.error("Error creating post:", error);
    c.status(500);
    return c.json({ error: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
});

postRouter.put("/blog", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate());

  const userId = c.get("userId");
  const body = await c.req.json();

  const { success } = updateBlogInput.safeParse(body);
  if (!success) {
    c.status(411);
    return c.json({ error: "Invalid input" });
  }

  try {
    const res = await prisma.post.update({
      where: {
        id: body.id,
        authorId: userId,
      },
      data: {
        title: body.title,
        content: body.content,
      },
    });

    return c.text("Updated post");
  } catch (error) {
    console.error("Error updating post:", error);
    c.status(500);
    // @ts-ignore
    return c.text(error.message);
  } finally {
    await prisma.$disconnect();
  }
});
