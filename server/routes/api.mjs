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
router.get('/studenti', isLoggedIn, async (req, res) => {
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

// GET /api/compiti – lista compiti
router.get('/compiti/miei', isLoggedIn, isDocente, async (req, res) => {
  try {
    const db = await dbPromise;

    // Trova id docente associato all'utente loggato
    const docente = await db.get('SELECT id FROM Docente WHERE userId = ?', req.user.id);
    //if (!docente) return res.status(403).json({ error: 'Utente non valido.' });

    const compiti = await db.all(`
      SELECT c.id as compitoId, c.domanda, c.stato, g.id as gruppoId
      FROM Compito c
      JOIN Gruppo g ON g.compitoId = c.id
      WHERE c.docenteId = ?
    `, [docente.id]);

    // Per ogni compito, ottieni studenti del gruppo
    // Per ogni compito, ottieni studenti del gruppo e verifica se esiste una risposta
    for (const compito of compiti) {
      const studenti = await db.all(`
    SELECT s.id, s.nome, s.cognome
    FROM Studente s
    JOIN StudenteGruppo sg ON sg.studenteId = s.id
    WHERE sg.gruppoId = ?
  `, [compito.gruppoId]);

      const risposta = await db.get(`
    SELECT 1 FROM Risposta WHERE gruppoId = ?
  `, [compito.gruppoId]);

      compito.studenti = studenti;
      compito.haRisposta = !!risposta; // true se esiste
      if (compito.stato === 'chiuso') {
        const valutazione = await db.get(`
      SELECT voto FROM Valutazione WHERE compitoId = ?
    `, [compito.compitoId]);
        compito.voto = valutazione?.voto ?? null;
      }
      delete compito.gruppoId; // opzionale
    }


    res.json(compiti);

  } catch (err) {
    console.error('Errore GET /api/compiti/miei:', err);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
});
router.post('/compiti/:id/valutazione', isLoggedIn, isDocente, async (req, res) => {
  const compitoId = req.params.id;
  const { voto } = req.body;

  if (typeof voto !== 'number' || voto < 0 || voto > 30) {
    return res.status(400).json({ error: 'Il voto deve essere un numero tra 0 e 30.' });
  }

  try {
    const db = await dbPromise;

    // Trova ID docente
    const docente = await db.get('SELECT id FROM Docente WHERE userId = ?', req.user.id);
    if (!docente) return res.status(403).json({ error: 'Accesso negato.' });

    // Verifica che il compito sia del docente
    const compito = await db.get(`
      SELECT c.id, c.stato, g.id as gruppoId
      FROM Compito c
      JOIN Gruppo g ON g.compitoId = c.id
      WHERE c.id = ? AND c.docenteId = ?
    `, [compitoId, docente.id]);

    if (!compito) return res.status(404).json({ error: 'Compito non trovato.' });
    if (compito.stato === 'chiuso') {
      return res.status(400).json({ error: 'Il compito è già chiuso.' });
    }

    // Verifica che esista una risposta
    const risposta = await db.get('SELECT id FROM Risposta WHERE gruppoId = ?', [compito.gruppoId]);
    if (!risposta) {
      return res.status(400).json({ error: 'Il gruppo non ha ancora inviato una risposta.' });
    }

    // Inserisci valutazione e chiudi il compito
    await db.run(`
      INSERT INTO Valutazione (compitoId, voto) VALUES (?, ?)
    `, [compito.id, voto]);

    await db.run(`
      UPDATE Compito SET stato = 'chiuso' WHERE id = ?
    `, [compito.id]);

    res.status(201).json({ message: 'Valutazione salvata e compito chiuso.' });

  } catch (err) {
    console.error('Errore in POST /compiti/:id/valutazione:', err);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
});
router.get('/compiti/:id/risposta', isLoggedIn, isDocente, async (req, res) => {
  const compitoId = req.params.id;

  try {
    const db = await dbPromise;

    // Verifica che il compito sia del docente
    const docente = await db.get('SELECT id FROM Docente WHERE userId = ?', req.user.id);
    if (!docente) return res.status(403).json({ error: 'Accesso negato.' });

    const compito = await db.get(`
      SELECT c.id, g.id as gruppoId
      FROM Compito c
      JOIN Gruppo g ON g.compitoId = c.id
      WHERE c.id = ? AND c.docenteId = ?
    `, [compitoId, docente.id]);

    if (!compito) return res.status(404).json({ error: 'Compito non trovato o non autorizzato.' });

    // Cerca la risposta
    const risposta = await db.get(`
      SELECT testo FROM Risposta WHERE gruppoId = ?
    `, [compito.gruppoId]);

    if (!risposta) {
      return res.status(404).json({ error: 'Risposta non ancora inviata.' });
    }

    res.json({ testo: risposta.testo });

  } catch (err) {
    console.error('Errore in GET /compiti/:id/risposta:', err);
    res.status(500).json({ error: 'Errore del server.' });
  }
});
router.post('/compiti/:id/risposta', isLoggedIn, isStudente, async (req, res) => {
  const compitoId = req.params.id;
  const { testo } = req.body;

  if (typeof testo !== 'string' || testo.trim() === '') {
    return res.status(400).json({ error: 'Il testo della risposta è obbligatorio.' });
  }

  try {
    const db = await dbPromise;

    // Verifica che il compito sia aperto
    const compito = await db.get(`
      SELECT c.id, c.stato, g.id as gruppoId
      FROM Compito c
      JOIN Gruppo g ON g.compitoId = c.id
      WHERE c.id = ?
    `, [compitoId]);

    if (!compito) return res.status(404).json({ error: 'Compito non trovato.' });
    if (compito.stato !== 'aperto') {
      return res.status(400).json({ error: 'Il compito è già stato chiuso e valutato.' });
    }

    // Trova id studente da userId
    const studente = await db.get('SELECT id FROM Studente WHERE userId = ?', req.user.id);
    if (!studente) return res.status(403).json({ error: 'Utente non studente.' });

    // Verifica che lo studente sia nel gruppo
    const membro = await db.get(`
  SELECT * FROM StudenteGruppo
  WHERE gruppoId = ? AND studenteId = ?
`, [compito.gruppoId, studente.id]);


    if (!membro) {
      return res.status(403).json({ error: 'Non fai parte del gruppo di questo compito.' });
    }

    // Verifica se esiste già una risposta
    const risposta = await db.get('SELECT id FROM Risposta WHERE gruppoId = ?', [compito.gruppoId]);

    if (risposta) {
      // aggiorna
      await db.run('UPDATE Risposta SET testo = ? WHERE gruppoId = ?', [testo, compito.gruppoId]);
    } else {
      // inserisce nuova
      await db.run('INSERT INTO Risposta (gruppoId, testo) VALUES (?, ?)', [compito.gruppoId, testo]);
    }

    res.status(200).json({ message: 'Risposta salvata con successo.' });

  } catch (err) {
    console.error('Errore in POST /compiti/:id/risposta:', err);
    res.status(500).json({ error: 'Errore del server.' });
  }
});

router.get('/miei-compiti-aperti', isLoggedIn, isStudente, async (req, res) => {
  try {
    const db = await dbPromise;
    const studente = await db.get('SELECT id FROM Studente WHERE userId = ?', req.user.id);
    if (!studente) return res.status(403).json({ error: 'Utente non studente.' });
    const compiti = await db.all(`
      SELECT 
        c.id as compitoId,
        c.domanda,
        d.nome as nomeDocente,
        d.cognome as cognomeDocente
      FROM Compito c
      JOIN Docente d ON d.id = c.docenteId
      JOIN Gruppo g ON g.compitoId = c.id
      JOIN StudenteGruppo sg ON sg.gruppoId = g.id
      WHERE sg.studenteId = ?
        AND c.stato = 'aperto'
    `, [studente.id]);

    res.json(compiti);

  } catch (err) {
    console.error('Errore in GET /miei-compiti-aperti:', err);
    res.status(500).json({ error: 'Errore del server.' });
  }
});
router.get('/miei-compiti-chiusi', isLoggedIn, isStudente, async (req, res) => {
  try {
    const db = await dbPromise;
    const studente = await db.get('SELECT id FROM Studente WHERE userId = ?', req.user.id);
    if (!studente) return res.status(403).json({ error: 'Utente non studente.' });
    // Recupera i compiti chiusi con voto
    const compiti = await db.all(`
      SELECT 
        c.id as compitoId,
        c.domanda,
        v.voto,
        COUNT(sg2.studenteId) as numStudenti
      FROM Compito c
      JOIN Gruppo g ON g.compitoId = c.id
      JOIN StudenteGruppo sg ON sg.gruppoId = g.id
      JOIN StudenteGruppo sg2 ON sg2.gruppoId = g.id
      JOIN Valutazione v ON v.compitoId = c.id
      WHERE sg.studenteId = ?
        AND c.stato = 'chiuso'
      GROUP BY c.id
    `, [studente.id]);

    // Calcola media pesata
    let sommaPesata = 0;
    let sommaPesi = 0;

    for (const compito of compiti) {
      const peso = 1 / compito.numStudenti;
      sommaPesata += compito.voto * peso;
      sommaPesi += peso;
    }

    const mediaPesata = sommaPesi > 0 ? (sommaPesata / sommaPesi).toFixed(2) : null;

    res.json({
      media: mediaPesata,
      compiti: compiti.map(c => ({
        id: c.compitoId,
        domanda: c.domanda,
        voto: c.voto,
        studentiNelGruppo: c.numStudenti
      }))
    });

  } catch (err) {
    console.error('Errore in GET /miei-compiti-chiusi:', err);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
});
router.get('/stato-classe', isLoggedIn, isDocente, async (req, res) => {
  const sort = req.query.sort || 'nome'; // nome | compiti | media

  try {
    const db = await dbPromise;

    const docente = await db.get('SELECT id FROM Docente WHERE userId = ?', req.user.id);
    if (!docente) return res.status(403).json({ error: 'Accesso negato' });

    const studenti = await db.all(`
      SELECT s.id, s.nome, s.cognome FROM Studente s
    `);

    const report = [];

    for (const studente of studenti) {
      const compiti = await db.all(`
        SELECT c.id, c.stato, v.voto, g.id as gruppoId
        FROM Compito c
        JOIN Gruppo g ON g.compitoId = c.id
        JOIN StudenteGruppo sg ON sg.gruppoId = g.id
        LEFT JOIN Valutazione v ON v.compitoId = c.id
        WHERE sg.studenteId = ? AND c.docenteId = ?
      `, [studente.id, docente.id]);

      let aperti = 0, chiusi = 0;
      let sommaPesata = 0;
      let sommaPesi = 0;

      for (const c of compiti) {
        if (c.stato === 'aperto') aperti++;
        else if (c.stato === 'chiuso') {
          chiusi++;
          if (c.voto !== null && c.gruppoId) {
            const numStudenti = await db.get(`
              SELECT COUNT(*) as n FROM StudenteGruppo WHERE gruppoId = ?
            `, [c.gruppoId]);

            const peso = 1 / numStudenti.n;
            sommaPesata += c.voto * peso;
            sommaPesi += peso;
          }
        }
      }

      report.push({
        id: studente.id,
        nome: studente.nome,
        cognome: studente.cognome,
        compitiAperti: aperti,
        compitiChiusi: chiusi,
        media: sommaPesi > 0 ? parseFloat((sommaPesata / sommaPesi).toFixed(2)) : null
      });
    }

    // Ordinamento
    if (sort === 'media') {
      report.sort((a, b) => (b.media || 0) - (a.media || 0));
    } else if (sort === 'compiti') {
      report.sort((a, b) => (b.compitiAperti + b.compitiChiusi) - (a.compitiAperti + a.compitiChiusi));
    } else {
      report.sort((a, b) => a.cognome.localeCompare(b.cognome) || a.nome.localeCompare(b.nome));
    }

    res.json(report);

  } catch (err) {
    console.error('Errore in GET /stato-classe:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

export default router;
