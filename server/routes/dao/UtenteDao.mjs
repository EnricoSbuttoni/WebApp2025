// dao/utenteDAO.mjs
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbPromise = open({ filename: './db/compiti.sqlite', driver: sqlite3.Database });

export async function getUserInfo(userId) {
  const db = await dbPromise;
  const utente = await db.get('SELECT id, email FROM Utente WHERE id = ?', userId);
  if (!utente) throw { status: 404, message: 'Utente non trovato.' };

  const studente = await db.get('SELECT nome, cognome FROM Studente WHERE userId = ?', userId);
  if (studente) {
    return {
      nome: studente.nome,
      cognome: studente.cognome,
      email: utente.email,
      ruolo: 'studente'
    };
  }

  const docente = await db.get('SELECT nome, cognome FROM Docente WHERE userId = ?', userId);
  if (docente) {
    return {
      nome: docente.nome,
      cognome: docente.cognome,
      email: utente.email,
      ruolo: 'docente'
    };
  }

  throw { status: 403, message: 'Ruolo utente non riconosciuto.' };
}
