import type { Request, Response } from "express";

const expressBundlePath = "../server.js";
const expressApp = import(expressBundlePath).then(
  (module) => module.default as (request: Request, response: Response) => unknown,
);

export default async function expressApiRelay(request: Request, response: Response) {
  return (await expressApp)(request, response);
}
