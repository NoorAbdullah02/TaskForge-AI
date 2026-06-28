import express from 'express';
import { env } from './config/env';
import cors from 'cors';
import helmet from 'helmet';
import requestIp from 'request-ip';
import http from 'http';
import { socketService } from './services/socket.service';

import userRoute from './routes/userRoute';
import projectRoute from './routes/project.routes';
import taskRoute from './routes/task.routes';
import adminRoute from './routes/admin.routes';
import agileRoute from './routes/agile.routes';
import attendanceRoute from './routes/attendance.routes';
import leaveRoute from './routes/leave.routes';
import uploadRoute from './routes/upload.routes';
import aiRoute from './routes/ai.routes';
import dashboardRoute from './routes/dashboard.routes';
import workspaceRoute from './routes/workspace.routes';
import superAdminRoute from './routes/superAdmin.routes';
import reportsRoute from './routes/reports.routes';
import intelligenceRoute from './routes/projectIntelligence.routes';
import chatRoute from './routes/chat.routes';
import kbRoute from './routes/kb.routes';
import timeRoute from './routes/time.routes';
import calendarRoute from './routes/calendar.routes';
import fileRoute from './routes/file.routes';
import notificationRoute from './routes/notification.routes';
import { AutomationScheduler } from './services/automation.scheduler';
import './workers/mail.worker';
import './workers/automation.worker';
import { startEscalationScheduler } from './services/escalation.scheduler';




import cookieParser from "cookie-parser";

import path from "path";


const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers (XSS, HSTS, CSP, clickjacking protection, etc.)
app.use(helmet({
    crossOriginEmbedderPolicy: false, // Required for some iframe embeds
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
            fontSrc: ["'self'", 'https://fonts.gstatic.com'],
            imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", env.FRONTEND_URL || '', 'wss:'],
        }
    }
}));

const allowedOrigins = [env.FRONTEND_URL, env.BACKEND_URL].filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        // Allow if no origin (server-to-server / same-origin) or in development allow all origins
        if (!origin) return callback(null, true);
        if (env.NODE_ENV === 'production') {
            if (allowedOrigins.includes(origin)) return callback(null, true);
            if (!env.FRONTEND_URL && !env.BACKEND_URL) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        }
        return callback(null, true);
    },
    credentials: true,
}));
app.use(cookieParser());
app.use(requestIp.mw());

// Health check endpoint for monitoring / load balancers
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'TaskForge AI API',
        version: process.env.npm_package_version || '1.0.0',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
    });
});


app.use("/api/users", userRoute);
app.use("/api/projects", projectRoute);
app.use("/api/tasks", taskRoute);
app.use("/api/admin", adminRoute);
app.use("/api/agile", agileRoute);
app.use("/api/attendance", attendanceRoute);
app.use("/api/leaves", leaveRoute);
app.use("/api/upload", uploadRoute);
app.use("/api/ai", aiRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/workspaces", workspaceRoute);
app.use("/api/super-admin", superAdminRoute);
app.use("/api/reports", reportsRoute);
app.use("/api/intelligence", intelligenceRoute);
app.use("/api/chat", chatRoute);
app.use("/api/kb", kbRoute);
app.use("/api/time", timeRoute);
app.use("/api/calendar", calendarRoute);
app.use("/api/files", fileRoute);
app.use("/api/notifications", notificationRoute);








if (env.NODE_ENV === 'production') {
    const __dirname = path.resolve();

    app.use(express.static(path.join(__dirname, "../frontend/dist")));

    app.use((req, res, next) => {
        if (req.method !== 'GET' || req.originalUrl.startsWith('/api')) {
            return next();
        }
        res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
    });
}



const server = http.createServer(app);
socketService.init(server);
startEscalationScheduler();
AutomationScheduler.init();

server.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
});