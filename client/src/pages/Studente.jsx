import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/authContext';

function StudentePage() {
  const { user } = useAuth();
  const [aperti, setAperti] = useState([]);
  const [chiusi, setChiusi] = useState([]);
  const [media, setMedia] = useState(null);
  const [risposte, setRisposte] = useState({}); // testo risposta per ogni compito
  const [loading, setLoading] = useState(false);

  // Carica compiti all'avvio
  useEffect(() => {
    const fetchCompiti = async () => {
      try {
        const resAperti = await fetch('http://localhost:3001/api/miei-compiti-aperti', {
          credentials: 'include',
        });
        const datiAperti = await resAperti.json();
        setAperti(datiAperti);

        const resChiusi = await fetch('http://localhost:3001/api/miei-compiti-chiusi', {
          credentials: 'include',
        });
        const datiChiusi = await resChiusi.json();
        setChiusi(datiChiusi.compiti);
        setMedia(datiChiusi.media);
      } catch (err) {
        console.error('Errore nel caricamento compiti:', err);
      }
    };

    if (user?.ruolo === 'studente') fetchCompiti();
  }, [user]);

  const handleSubmit = async (e, compitoId) => {
    e.preventDefault();
    const testo = risposte[compitoId];
    if (!testo || testo.trim() === '') {
      alert('Inserisci un testo valido.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/api/compiti/${compitoId}/risposta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ testo }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert('Errore: ' + err.error);
        return;
      }

      alert('Risposta salvata!');
    } catch (err) {
      console.error('Errore invio risposta:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Benvenuto, {user?.nome || user?.email}</h2>

      <h3>Compiti Aperti</h3>
      {aperti.length === 0 ? (
        <p>Nessun compito aperto disponibile.</p>
      ) : (
        <ul>
          {aperti.map((c) => (
            <li key={c.compitoId}>
              <strong>Domanda:</strong> {c.domanda} <br />
              <strong>Docente:</strong> {c.nomeDocente} {c.cognomeDocente} <br />
              <form onSubmit={(e) => handleSubmit(e, c.compitoId)}>
                <textarea
                  rows={3}
                  value={risposte[c.compitoId] || ''}
                  onChange={(e) =>
                    setRisposte((prev) => ({ ...prev, [c.compitoId]: e.target.value }))
                  }
                  placeholder="Scrivi la risposta del gruppo..."
                  required
                />
                <br />
                <button type="submit" disabled={loading}>
                  {loading ? 'Salvataggio...' : 'Invia / Aggiorna risposta'}
                </button>
              </form>
              <hr />
            </li>
          ))}
        </ul>
      )}

      <h3>Compiti Valutati</h3>
      {chiusi.length === 0 ? (
        <p>Nessun compito valutato ancora.</p>
      ) : (
        <ul>
          {chiusi.map((c) => (
            <li key={c.id}>
              <strong>Domanda:</strong> {c.domanda} <br />
              <strong>Voto:</strong> {c.voto}/30 <br />
              <strong>Studenti nel gruppo:</strong> {c.studentiNelGruppo}
              <hr />
            </li>
          ))}
        </ul>
      )}

      <h3>Media Ponderata:</h3>
      <p>{media !== null ? `${media}/30` : 'Non disponibile'}</p>
    </div>
  );
}

export default StudentePage;
