import express, { Express, Request, Response, NextFunction } from "express";
import helmet from 'helmet';
import { fromNodeHeaders } from "better-auth/node";

import cors from 'cors';
import morgan from 'morgan';
import hpp from 'hpp';
import { globalErrorHandler } from './middlewares/error.js';
import ApiError from './utils/apiError.js';
import { env } from './config/env.js';
import { apiLimiter } from './middlewares/rateLimiter.js';

import organization from "./routes/organization.routes.js";
import { auth } from './lib/auth.js';
import { toNodeHandler } from "better-auth/node";
import { requireVerifiedOrg } from "./middlewares/requireVerifiedOrg.js";

const app: Express = express();

// ─── 1) GLOBAL MIDDLEWARES ──────────────────────────────────────────────────

// Set security HTTP headers
// app.use(helmet({
//     crossOriginResourcePolicy: { policy: "cross-origin" }
// }));

// CORS — uses env vars, no hardcoded origins

// app.use(cors({
//     origin: [env.CLIENT_URL, env.ADMIN_CLIENT_URL],
//     credentials: true,
// }));

app.use(cors({
  origin: [env.CLIENT_URL, env.ADMIN_CLIENT_URL, env.ORG_CLIENT_URL],
  credentials: true,
}));

// Development logging
if (env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// ─── 2) BETTER-AUTH ROUTES ──────────────────────────────────────────────────
// IMPORTANT: Must be BEFORE express.json() — toNodeHandler needs the raw
// request body stream. If express.json() runs first it consumes the stream
// and the auth handler receives an empty body.
app.use("/api/auth", toNodeHandler(auth));

// Body parser (after auth routes so it doesn't consume the auth body)
app.use(express.json({ limit: '10kb' }));

// Prevent parameter pollution
app.use(hpp());

// ─── 3) APP ROUTES ──────────────────────────────────────────────────────────

// Protected route — verify session via better-auth
app.get("/api/me", async (req, res) => {
    const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
    });

    if (!session) return res.status(401).json({ message: "Unauthorized" });

    res.json(session.user);
});

app.use('/api/organization', organization);
// entire route group protected in one line
// app.use("/api/ngos/rescues", requireVerifiedOrg, rescueRoutes);
// app.use("/api/ngos/animals", requireVerifiedOrg, animalRoutes);

// ─── 4) ERROR HANDLING ──────────────────────────────────────────────────────

// Catch unmatched routes
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new ApiError(404, `Cannot find ${req.originalUrl} on this server!`));
});

app.use(globalErrorHandler);

export default app;
