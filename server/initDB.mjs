import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs/promises';
import bcrypt from 'bcrypt';

const DB_PATH = './db/compiti.sqlite';
const SCHEMA_PATH = './db/schema.sql';

async function initDatabase() {
  const schema = await fs.readFile(SCHEMA_PATH, 'utf-8');

  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  // Esegui lo schema
  await db.exec(schema);
  console.log('✅ Schema creato.');

  const password = 'password';
  const saltRounds = 10;

  // Inserisci 2 docenti
  for (let i = 1; i <= 2; i++) {
    const email = `d${i}@webapp.it`;
    const hash = await bcrypt.hash(password, saltRounds);
    await db.run('INSERT INTO Utente (email, passwordHash, ruolo) VALUES (?, ?, ?)', [email, hash, 'docente']);
    await db.run(`
      INSERT INTO Docente (nome, cognome, userId)
      VALUES (?, ?, (SELECT id FROM Utente WHERE email = ?))
    `, [`Docente${i}`, `Cognome${i}`, email]);
  }

  // Inserisci 20 studenti
  for (let i = 1; i <= 20; i++) {
    const email = `s${i}@webapp.it`;
    const hash = await bcrypt.hash(password, saltRounds);
    await db.run('INSERT INTO Utente (email, passwordHash, ruolo) VALUES (?, ?, ?)', [email, hash, 'studente']);
    await db.run(`
      INSERT INTO Studente (nome, cognome, userId)
      VALUES (?, ?, (SELECT id FROM Utente WHERE email = ?))
    `, [`Studente${i}`, `Cognome${i}`, email]);
  }

  console.log('✅ Utenti inseriti con successo.');
  await db.close();
}

initDatabase().catch(err => {
  console.error('❌ Errore durante l\'inizializzazione:', err);
});
