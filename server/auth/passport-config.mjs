import passport from 'passport';
import LocalStrategy from 'passport-local';
import bcrypt from 'bcrypt';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Connessione al database SQLite (una sola volta)
const dbPromise = open({
  filename: './db/compiti.sqlite',
  driver: sqlite3.Database
});

// Strategia di autenticazione "Local" (email + password)
passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const db = await dbPromise;

      const user = await db.get('SELECT * FROM Utente WHERE email = ?', username);

      if (!user) {
        return done(null, false, { message: 'Utente non trovato' });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);

      if (!valid) {
        return done(null, false, { message: 'Password errata' });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Salvataggio dell'ID utente nella sessione
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Lettura dell'utente completo a partire dall'ID in sessione
passport.deserializeUser(async (id, done) => {
  try {
    const db = await dbPromise;
    const user = await db.get('SELECT * FROM Utente WHERE id = ?', id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
