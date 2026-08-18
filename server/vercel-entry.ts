import express from "express";
import { createApp } from "./_core/index";

// The Vercel build emits this module to the recognized root `server.js` entry.
// Keep the direct Express import so Vercel detects the generated application.
void express;
export default createApp();
