import express from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const router = express.Router();

// Funzione middleware locale per proteggere le API, e per verificare il ruolo
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Utente non autenticato' });
}
function isDocente(req, res, next) {
  if (req.user?.ruolo === 'docente') return next();
  return res.status(403).json({ error: 'Accesso riservato ai docenti.' });
}

function isStudente(req, res, next) {
  if (req.user?.ruolo === 'studente') return next();
  return res.status(403).json({ error: 'Accesso riservato agli studenti.' });
}
// Connessione al database
const dbPromise = open({
  filename: './db/compiti.sqlite',
  driver: sqlite3.Database
});

// Esempio API protetta – Lista studenti
router.get('/students', isLoggedIn, async (req, res) => {
  try {
    const db = await dbPromise;
    const students = await db.all(`
      SELECT s.id, s.nome, s.cognome, u.email
      FROM Studente s JOIN Utente u ON s.userId = u.id
    `);
    res.json(students);
  } catch (err) {
    console.error('Errore nella query:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});


// POST /api/compiti – crea nuovo compito
router.post('/compiti', isLoggedIn, isDocente, async (req, res) => {
  const { domanda, studenti } = req.body;
  if (!domanda || !Array.isArray(studenti) || studenti.length < 2 || studenti.length > 6) {
    return res.status(400).json({ error: 'Domanda e gruppo valido (2‑6 studenti) sono obbligatori.' });
  }

  try {
    const db = await dbPromise;

    // Recupero docente
    const docenteDB = await db.get(
      'SELECT id FROM Docente WHERE userId = ?',
      req.user.id
    );
    if (!docenteDB) return res.status(403).json({ error: 'Utente non docente.' });
    const docenteId = docenteDB.id;

    // Verifica coppie
    for (let i = 0; i < studenti.length; i++) {
      for (let j = i + 1; j < studenti.length; j++) {
        const sid1 = studenti[i];
        const sid2 = studenti[j];
        const r = await db.get(`
          SELECT COUNT(*) AS count
          FROM StudenteGruppo sg1
          JOIN StudenteGruppo sg2 ON sg1.gruppoId = sg2.gruppoId AND sg1.studenteId < sg2.studenteId
          JOIN Gruppo g ON g.id = sg1.gruppoId
          JOIN Compito c ON c.id = g.compitoId
          WHERE c.docenteId = ?
            AND sg1.studenteId = ?
            AND sg2.studenteId = ?
        `, [docenteId, sid1, sid2]);
        if (r.count >= 2) {
          return res.status(400).json({
            error: `Studenti ${sid1} e ${sid2} hanno già fatto ${r.count} compiti insieme.`
          });
        }
      }
    }

    // Inserimento compito
    const compitoRes = await db.run(
      `INSERT INTO Compito (docenteId, domanda, stato) VALUES (?, ?, 'aperto')`,
      [docenteId, domanda]
    );
    const compitoId = compitoRes.lastID;

    // Creazione gruppo
    const gruppoRes = await db.run(
      `INSERT INTO Gruppo (compitoId) VALUES (?)`,
      [compitoId]
    );
    const gruppoId = gruppoRes.lastID;

    // Inserimento studenti nel gruppo
    await Promise.all(
      studenti.map(stId =>
        db.run(
          `INSERT INTO StudenteGruppo (gruppoId, studenteId) VALUES (?, ?)`,
          [gruppoId, stId]
        )
      )
    );

    res.status(201).json({ message: 'Compito creato.', compitoId });
  } catch (err) {
    console.error('Errore in POST /compiti:', err);
    res.status(500).json({ error: 'Errore interno server.' });
  }
});

export default router;
