// dao/studenteDAO.mjs
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbPromise = open({ filename: './db/compiti.sqlite', driver: sqlite3.Database });

export async function getAllStudenti() {
  const db = await dbPromise;
  return await db.all(`
    SELECT s.id, s.nome, s.cognome, u.email
    FROM Studente s
    JOIN Utente u ON s.userId = u.id
  `);
}
