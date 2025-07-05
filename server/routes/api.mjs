
import express from 'express';
import {
  getAllStudenti
} from './dao/StudenteDao.mjs';
import {
  creaCompitoConGruppo, getCompitiByDocente, salvaValutazione, getRispostaByCompito,
  salvaRispostaStudente, getCompitiApertiPerStudente, getCompitiChiusiPerStudente,
  getStatoClasse
} from './dao/CompitoDao.mjs';
import { getUserInfo } from './DAO/UtenteDao.mjs';

const router = express.Router();

// Middleware
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

// API routes
router.get('/studenti', isLoggedIn, async (req, res) => {
  try {
    const students = await getAllStudenti();
    res.json(students);
  } catch (err) {
    console.error('Errore /studenti:', err);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

router.post('/compiti', isLoggedIn, isDocente, async (req, res) => {
  try {
    const result = await creaCompitoConGruppo(req.user.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Errore interno server.' });
  }
});

router.get('/compiti/miei', isLoggedIn, isDocente, async (req, res) => {
  try {
    const result = await getCompitiByDocente(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('GET /compiti/miei:', err);
    res.status(500).json({ error: 'Errore interno del server.' });
  }
});

router.post('/compiti/:id/valutazione', isLoggedIn, isDocente, async (req, res) => {
  try {
    const result = await salvaValutazione(req.user.id, req.params.id, req.body.voto);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Errore interno del server.' });
  }
});

router.get('/compiti/:id/risposta', isLoggedIn, isDocente, async (req, res) => {
  try {
    const result = await getRispostaByCompito(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Errore server.' });
  }
});

router.post('/compiti/:id/risposta', isLoggedIn, isStudente, async (req, res) => {
  try {
    const result = await salvaRispostaStudente(req.user.id, req.params.id, req.body.testo);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Errore del server.' });
  }
});

router.get('/miei-compiti-aperti', isLoggedIn, isStudente, async (req, res) => {
  try {
    const result = await getCompitiApertiPerStudente(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Errore del server.' });
  }
});

router.get('/miei-compiti-chiusi', isLoggedIn, isStudente, async (req, res) => {
  try {
    const result = await getCompitiChiusiPerStudente(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server.' });
  }
});

router.get('/stato-classe', isLoggedIn, isDocente, async (req, res) => {
  try {
    const { sort = 'nome', direction = 'asc' } = req.query;
    const result = await getStatoClasse(req.user.id, sort, direction);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server' });
  }
});


router.get('/mio-nome', isLoggedIn, async (req, res) => {
  try {
    const result = await getUserInfo(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Errore interno del server.' });
  }
});

router.get('/mia-risposta/:id', isLoggedIn, isStudente, async (req, res) => {
  try {
    const result = await import('./dao/RispostaDao.mjs').then(m => m.getMiaRisposta(req.user.id, req.params.id));
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Errore del server.' });
  }
});

export default router;
