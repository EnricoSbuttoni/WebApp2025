import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import authRoutes from './routes/auth.mjs';
import apiRoutes from './routes/api.mjs';
import './auth/passport-config.mjs';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bodyParser from 'body-parser';
import morgan from 'morgan';

const app = express();
const PORT = 3001;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(express.json());

app.use(session({
  secret: 'verysecretkey',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api', authRoutes);
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
