import express from 'express';
import { env } from './config/env';
import cors from 'cors';
import requestIp from 'request-ip';

import userRoute from './routes/userRoute';

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
            if (origin === env.FRONTEND_URL) return callback(null, true);
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




/// For frontrend and backend in one link

if (env.NODE_ENV === 'production') {
    const __dirname = path.resolve();

    // server static folder run

    app.use(express.static(path.join(__dirname, "../frontend/dist")));

    app.get("/{*any}", (req, res) => {
        res.sendFile(path.join(__dirname, "../frontend/dist/index.html"))
    })
}



app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`);
})