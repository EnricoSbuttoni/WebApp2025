import express from 'express';
import passport from 'passport';

const router = express.Router();

// LOGIN - POST /api/login
router.post('/login', passport.authenticate('local'), (req, res) => {
  // Se arriva qui, l'autenticazione è andata a buon fine
  const user = req.user;
  res.json({
    id: user.id,
    email: user.email,
    ruolo: user.ruolo
  });
});

// LOGOUT - POST /api/logout
router.post('/logout', (req, res) => {
  req.logout(err => {
    if (err) return res.status(500).json({ error: 'Errore nel logout' });
    res.end(); // fine senza contenuto
  });
});

// SESSIONE - GET /api/session
router.get('/session', (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user;
    res.json({
      id: user.id,
      email: user.email,
      ruolo: user.ruolo
    });
  } else {
    res.status(401).json({ error: 'Non autenticato' });
  }
});

export default router;
