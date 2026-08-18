import express from "express";
import { createApp } from "./app";

// The Vercel build emits this module to the recognized root `server.js` entry.
// It imports no development-only Vite code and keeps Express detection explicit.
void express;
export default createApp();
