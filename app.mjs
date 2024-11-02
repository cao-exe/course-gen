import './db.mjs';
import mongoose from 'mongoose';
import express from 'express'
import session from 'express-session';
import path from 'path'
import { fileURLToPath } from 'url';
import hbs from 'hbs';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.set('view engine', 'hbs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));



app.listen(process.env.PORT || 3000);
