// dao/rispostaDAO.mjs
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbPromise = open({ filename: './db/compiti.sqlite', driver: sqlite3.Database });

export async function getMiaRisposta(userId, compitoId) {
  const db = await dbPromise;
  const studente = await db.get('SELECT id FROM Studente WHERE userId = ?', userId);
  if (!studente) throw { status: 403, message: 'Utente non studente.' };

  const gruppo = await db.get(`
    SELECT g.id as gruppoId
    FROM Gruppo g
    JOIN StudenteGruppo sg ON sg.gruppoId = g.id
    WHERE g.compitoId = ? AND sg.studenteId = ?
  `, [compitoId, studente.id]);

  if (!gruppo) throw { status: 403, message: 'Non fai parte del gruppo per questo compito.' };

  const risposta = await db.get('SELECT testo FROM Risposta WHERE gruppoId = ?', [gruppo.gruppoId]);

  if (!risposta) return { empty: true, testo: '' };

  return { empty: false, testo: risposta.testo };
}
