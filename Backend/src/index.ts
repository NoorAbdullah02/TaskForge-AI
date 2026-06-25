import express from 'express';
import { env } from './config/env';
import cors from 'cors';
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




import cookieParser from "cookie-parser";

import path from "path";


const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: (origin, callback) => {
        // Allow if no origin (server-to-server / same-origin) or in development allow all origins
        if (!origin) return callback(null, true);
        if (env.NODE_ENV === 'production') {
            if (origin === env.FRONTEND_URL || origin === env.BACKEND_URL) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        }
        // in development allow all (use withCredentials for cookies)
        return callback(null, true);
    },
    credentials: true,
}));
app.use(cookieParser());
app.use(requestIp.mw());

app.get('/check', (req, res) => {
    res.json({
        message: "WellCome to Product Store",
        points: {
            users: "/api/users",
        }
    })
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







/// For frontrend and backend in one link

if (env.NODE_ENV === 'production') {
    const __dirname = path.resolve();

    // server static folder run

    app.use(express.static(path.join(__dirname, "../frontend/dist")));

    app.get("/{*any}", (req, res) => {
        res.sendFile(path.join(__dirname, "../frontend/dist/index.html"))
    })
}



const server = http.createServer(app);
socketService.init(server);

server.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
});