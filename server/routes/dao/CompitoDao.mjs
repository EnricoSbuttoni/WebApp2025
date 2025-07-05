// dao/compitoDAO.mjs
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const dbPromise = open({ filename: './db/compiti.sqlite', driver: sqlite3.Database });

export async function creaCompitoConGruppo(userId, { domanda, studenti }) {
  if (!domanda || !Array.isArray(studenti) || studenti.length < 2 || studenti.length > 6)
    throw { status: 400, message: 'Domanda e gruppo valido (2‑6 studenti) sono obbligatori.' };

  const db = await dbPromise;
  const docenteDB = await db.get('SELECT id FROM Docente WHERE userId = ?', userId);
  if (!docenteDB) throw { status: 403, message: 'Utente non docente.' };
  const docenteId = docenteDB.id;

  // Verifica coppie
  for (let i = 0; i < studenti.length; i++) {
    for (let j = i + 1; j < studenti.length; j++) {
      const [sid1, sid2] = [studenti[i], studenti[j]];
      const r = await db.get(`
        SELECT COUNT(*) AS count FROM StudenteGruppo sg1
        JOIN StudenteGruppo sg2 ON sg1.gruppoId = sg2.gruppoId AND sg1.studenteId < sg2.studenteId
        JOIN Gruppo g ON g.id = sg1.gruppoId
        JOIN Compito c ON c.id = g.compitoId
        WHERE c.docenteId = ? AND sg1.studenteId = ? AND sg2.studenteId = ?
      `, [docenteId, sid1, sid2]);
      if (r.count >= 2) throw {
        status: 400,
        message: `Studenti ${sid1} e ${sid2} hanno già fatto ${r.count} compiti insieme.`
      };
    }
  }

  const compitoRes = await db.run(
    'INSERT INTO Compito (docenteId, domanda, stato) VALUES (?, ?, \"aperto\")',
    [docenteId, domanda]
  );
  const compitoId = compitoRes.lastID;
  const gruppoRes = await db.run('INSERT INTO Gruppo (compitoId) VALUES (?)', [compitoId]);
  const gruppoId = gruppoRes.lastID;

  await Promise.all(studenti.map(id =>
    db.run('INSERT INTO StudenteGruppo (gruppoId, studenteId) VALUES (?, ?)', [gruppoId, id])
  ));

  return { message: 'Compito creato.', compitoId };
}

export async function getCompitiByDocente(userId) {
  const db = await dbPromise;
  const docente = await db.get('SELECT id FROM Docente WHERE userId = ?', userId);
  const compiti = await db.all(`
    SELECT c.id as compitoId, c.domanda, c.stato, g.id as gruppoId
    FROM Compito c JOIN Gruppo g ON g.compitoId = c.id WHERE c.docenteId = ?
  `, [docente.id]);

  for (const c of compiti) {
    const studenti = await db.all(`
      SELECT s.id, s.nome, s.cognome FROM Studente s
      JOIN StudenteGruppo sg ON sg.studenteId = s.id
      WHERE sg.gruppoId = ?
    `, [c.gruppoId]);
    const risposta = await db.get('SELECT 1 FROM Risposta WHERE gruppoId = ?', [c.gruppoId]);
    c.studenti = studenti;
    c.haRisposta = !!risposta;
    if (c.stato === 'chiuso') {
      const v = await db.get('SELECT voto FROM Valutazione WHERE compitoId = ?', [c.compitoId]);
      c.voto = v?.voto ?? null;
    }
    delete c.gruppoId;
  }

  return compiti;
}

export async function salvaValutazione(userId, compitoId, voto) {
  if (typeof voto !== 'number' || voto < 0 || voto > 30)
    throw { status: 400, message: 'Voto non valido.' };

  const db = await dbPromise;
  const docente = await db.get('SELECT id FROM Docente WHERE userId = ?', userId);
  const compito = await db.get(`
    SELECT c.id, c.stato, g.id as gruppoId
    FROM Compito c JOIN Gruppo g ON g.compitoId = c.id
    WHERE c.id = ? AND c.docenteId = ?
  `, [compitoId, docente.id]);
  if (!compito) throw { status: 404, message: 'Compito non trovato.' };
  if (compito.stato === 'chiuso') throw { status: 400, message: 'Compito già chiuso.' };

  const risposta = await db.get('SELECT id FROM Risposta WHERE gruppoId = ?', [compito.gruppoId]);
  if (!risposta) throw { status: 400, message: 'Nessuna risposta trovata.' };

  await db.run('INSERT INTO Valutazione (compitoId, voto) VALUES (?, ?)', [compito.id, voto]);
  await db.run('UPDATE Compito SET stato = \"chiuso\" WHERE id = ?', [compito.id]);

  return { message: 'Valutazione salvata e compito chiuso.' };
}

export async function getRispostaByCompito(userId, compitoId) {
  const db = await dbPromise;
  const docente = await db.get('SELECT id FROM Docente WHERE userId = ?', userId);
  const compito = await db.get(`
    SELECT c.id, g.id as gruppoId
    FROM Compito c JOIN Gruppo g ON g.compitoId = c.id
    WHERE c.id = ? AND c.docenteId = ?
  `, [compitoId, docente.id]);
  if (!compito) throw { status: 404, message: 'Compito non trovato o non autorizzato.' };

  const risposta = await db.get('SELECT testo FROM Risposta WHERE gruppoId = ?', [compito.gruppoId]);
  if (!risposta) throw { status: 404, message: 'Risposta non trovata.' };

  return { testo: risposta.testo };
}

export async function salvaRispostaStudente(userId, compitoId, testo) {
  if (!testo || testo.trim() === '')
    throw { status: 400, message: 'Il testo della risposta è obbligatorio.' };

  const db = await dbPromise;
  const studente = await db.get('SELECT id FROM Studente WHERE userId = ?', userId);
  const compito = await db.get(`
    SELECT c.id, c.stato, g.id as gruppoId
    FROM Compito c JOIN Gruppo g ON g.compitoId = c.id
    WHERE c.id = ?
  `, [compitoId]);

  if (compito.stato !== 'aperto')
    throw { status: 400, message: 'Compito già chiuso.' };

  const membro = await db.get(
    'SELECT * FROM StudenteGruppo WHERE gruppoId = ? AND studenteId = ?',
    [compito.gruppoId, studente.id]
  );
  if (!membro) throw { status: 403, message: 'Non fai parte del gruppo.' };

  const esiste = await db.get('SELECT id FROM Risposta WHERE gruppoId = ?', [compito.gruppoId]);
  if (esiste) {
    await db.run('UPDATE Risposta SET testo = ? WHERE gruppoId = ?', [testo, compito.gruppoId]);
  } else {
    await db.run('INSERT INTO Risposta (gruppoId, testo) VALUES (?, ?)', [compito.gruppoId, testo]);
  }

  return { message: 'Risposta salvata con successo.' };
}

export async function getCompitiApertiPerStudente(userId) {
  const db = await dbPromise;
  const studente = await db.get('SELECT id FROM Studente WHERE userId = ?', userId);
  const compiti = await db.all(`
    SELECT c.id as compitoId, c.domanda, d.nome as nomeDocente, d.cognome as cognomeDocente, g.id as gruppoId
    FROM Compito c JOIN Docente d ON d.id = c.docenteId
    JOIN Gruppo g ON g.compitoId = c.id
    JOIN StudenteGruppo sg ON sg.gruppoId = g.id
    WHERE sg.studenteId = ? AND c.stato = 'aperto'
  `, [studente.id]);

  return await Promise.all(compiti.map(async (c) => {
    const studenti = await db.all(`
      SELECT nome, cognome FROM Studente s
      JOIN StudenteGruppo sg ON sg.studenteId = s.id
      WHERE sg.gruppoId = ?
    `, [c.gruppoId]);
    return {
      compitoId: c.compitoId,
      domanda: c.domanda,
      nomeDocente: c.nomeDocente,
      cognomeDocente: c.cognomeDocente,
      studentiNelGruppo: studenti.map(s => `${s.nome} ${s.cognome}`).join(', ')
    };
  }));
}

export async function getCompitiChiusiPerStudente(userId) {
  const db = await dbPromise;
  const studente = await db.get('SELECT id FROM Studente WHERE userId = ?', userId);
  const compiti = await db.all(`
    SELECT c.id as compitoId, c.domanda, v.voto, g.id as gruppoId
    FROM Compito c
    JOIN Gruppo g ON g.compitoId = c.id
    JOIN StudenteGruppo sg ON sg.gruppoId = g.id
    JOIN Valutazione v ON v.compitoId = c.id
    WHERE sg.studenteId = ? AND c.stato = 'chiuso'
    GROUP BY c.id
  `, [studente.id]);

  let sommaPesata = 0;
  let sommaPesi = 0;
  const risultati = [];

  for (const c of compiti) {
    const studenti = await db.all(`
      SELECT nome, cognome FROM Studente s
      JOIN StudenteGruppo sg ON sg.studenteId = s.id
      WHERE sg.gruppoId = ?
    `, [c.gruppoId]);
    const peso = 1 / studenti.length;
    sommaPesata += c.voto * peso;
    sommaPesi += peso;

    risultati.push({
      id: c.compitoId,
      domanda: c.domanda,
      voto: c.voto,
      studentiNelGruppo: studenti.map(s => `${s.nome} ${s.cognome}`).join(', ')
    });
  }

  const media = sommaPesi > 0 ? (sommaPesata / sommaPesi).toFixed(2) : null;
  return { media, compiti: risultati };
}

export async function getStatoClasse(userId, sort = 'nome', direction = 'asc') {
  const db = await dbPromise;
  const docente = await db.get('SELECT id FROM Docente WHERE userId = ?', userId);
  const studenti = await db.all('SELECT s.id, s.nome, s.cognome FROM Studente s');
  const report = [];

  for (const s of studenti) {
    const compiti = await db.all(`
      SELECT c.id, c.stato, v.voto, g.id as gruppoId
      FROM Compito c
      JOIN Gruppo g ON g.compitoId = c.id
      JOIN StudenteGruppo sg ON sg.gruppoId = g.id
      LEFT JOIN Valutazione v ON v.compitoId = c.id
      WHERE sg.studenteId = ? AND c.docenteId = ?
    `, [s.id, docente.id]);

    let aperti = 0, chiusi = 0;
    let sommaPesata = 0;
    let sommaPesi = 0;

    for (const c of compiti) {
      if (c.stato === 'aperto') aperti++;
      else if (c.voto !== null) {
        chiusi++;
        const n = await db.get('SELECT COUNT(*) as n FROM StudenteGruppo WHERE gruppoId = ?', [c.gruppoId]);
        const peso = 1 / n.n;
        sommaPesata += c.voto * peso;
        sommaPesi += peso;
      }
    }

    report.push({
      id: s.id,
      nome: s.nome,
      cognome: s.cognome,
      compitiAperti: aperti,
      compitiChiusi: chiusi,
      media: sommaPesi > 0 ? parseFloat((sommaPesata / sommaPesi).toFixed(2)) : null
    });
  }

  const compare = (a, b) => {
    const dir = direction === 'desc' ? -1 : 1;

    if (sort === 'media') {
      return dir * ((a.media || 0) - (b.media || 0));
    } else if (sort === 'compiti') {
      const totalA = a.compitiAperti + a.compitiChiusi;
      const totalB = b.compitiAperti + b.compitiChiusi;
      return dir * (totalA - totalB);
    } else {
      // ordinamento per cognome + nome
      const cmpCognome = a.cognome.localeCompare(b.cognome);
      const cmpNome = a.nome.localeCompare(b.nome);
      return dir * (cmpCognome !== 0 ? cmpCognome : cmpNome);
    }
  };

  report.sort(compare);
  return report;
}
