import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/authContext';

function DocentePage() {
  const { user } = useAuth();
  const [compiti, setCompiti] = useState([]);
  const [selectedCompito, setSelectedCompito] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'vedi' | 'valuta'
  const [rispostaTesto, setRispostaTesto] = useState(null);
  const [valutazione, setValutazione] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [studentiDisponibili, setStudentiDisponibili] = useState([]);
  const [domanda, setDomanda] = useState('');
  const [studentiSelezionati, setStudentiSelezionati] = useState([]);

  useEffect(() => {
    const fetchCompiti = async () => {
      const res = await fetch('http://localhost:3001/api/compiti/miei', {
        credentials: 'include',
      });
      const data = await res.json();
      setCompiti(data);
    };

    if (user?.ruolo === 'docente') fetchCompiti();
  }, [user]);
  const handleVediRisposta = async (id) => {
    try {
      const res = await fetch(`http://localhost:3001/api/compiti/${id}/risposta`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Risposta non disponibile');
      }
      const data = await res.json();
      const compito = compiti.find(c => c.compitoId === id);
      setSelectedCompito(compito);
      setRispostaTesto(data.testo);
      setModalMode('vedi');
    } catch (err) {
      console.error('Errore:', err);
      setRispostaTesto('Errore: risposta non trovata.');
      setSelectedCompito(compiti.find(c => c.compitoId === id));
      setModalMode('vedi');
    }
  };

  const handleValutazione = (id) => {
    const compito = compiti.find(c => c.compitoId === id);
    setSelectedCompito(compito);
    setModalMode('valuta');
  };
  const handleSubmitValutazione = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:3001/api/compiti/${selectedCompito.compitoId}/valutazione`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ voto: parseInt(valutazione) }),
      });

      if (!res.ok) {
        throw new Error('Errore nella valutazione');
      }

      // Ricarica la lista dei compiti dopo la valutazione
      const updated = await fetch('http://localhost:3001/api/compiti/miei', {
        credentials: 'include',
      });
      const data = await updated.json();
      setCompiti(data);

      // Reset modale
      setSelectedCompito(null);
      setModalMode(null);
      setValutazione('');
    } catch (err) {
      console.error(err);
    }
  };
  const apriModaleCreazione = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/studenti', {
        credentials: 'include',
      });
      const data = await res.json();
      setStudentiDisponibili(data);
      setShowCreateModal(true);
    } catch (err) {
      console.error('Errore nel recupero studenti:', err);
    }
  };
  const creaNuovoCompito = async (e) => {
    e.preventDefault();
    if (studentiSelezionati.length < 2 || studentiSelezionati.length > 6) {
      alert('Seleziona tra 2 e 6 studenti.');
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/api/compiti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          domanda,
          studenti: studentiSelezionati,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert('Errore: ' + err.error);
        return;
      }

      // Ricarica i compiti
      const r = await fetch('http://localhost:3001/api/compiti/miei', {
        credentials: 'include',
      });
      const compitiAggiornati = await r.json();
      setCompiti(compitiAggiornati);

      // Reset
      setDomanda('');
      setStudentiSelezionati([]);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Errore creazione compito:', err);
    }
  };





  return (
    <div>
      <h2>Compiti Creati da {user?.nome || user?.email}</h2>
      <ul>
        {compiti.map(c => (
          <li key={c.compitoId}>
            <strong>Domanda:</strong> {c.domanda} <br />
            <strong>Stato:</strong>{' '}
{c.stato === 'chiuso' ? (
  <>
    ✅ Valutato – <strong>Voto:</strong> {c.voto}<br />
  </>
) : c.haRisposta ? (
  '✍️ Risposto ma non valutato'
) : (
  '🕓 In attesa di risposta'
)} <br />
            <strong>Studenti:</strong> {c.studenti.map(s => s.nome).join(', ')} <br />
            {c.stato !== 'chiuso' && c.haRisposta &&(
              <button onClick={() => handleValutazione(c.compitoId)}>Valuta</button>
            )}
            {c.haRisposta && (
              <button onClick={() => handleVediRisposta(c.compitoId)}>Vedi risposta</button>
            )}
          </li>
        ))}
      </ul>
      {selectedCompito && modalMode === 'vedi' && (
        <div className="modal">
          <h3>Risposta del gruppo</h3>
          <p><strong>Domanda:</strong> {selectedCompito.domanda}</p>
          <p><strong>Risposta:</strong> {rispostaTesto}</p>
          <button onClick={() => setSelectedCompito(null)}>Chiudi</button>
        </div>
      )}

      {selectedCompito && modalMode === 'valuta' && (
        <div className="modal">
          <h3>Valuta compito</h3>
          <p><strong>Domanda:</strong> {selectedCompito.domanda}</p>
          <form onSubmit={handleSubmitValutazione}>
            <label>
              Punteggio (0-30):{' '}
              <input
                type="number"
                min={0}
                max={30}
                value={valutazione}
                onChange={(e) => setValutazione(e.target.value)}
                required
              />
            </label>
            <button type="submit">Conferma</button>
          </form>
          <button onClick={() => setSelectedCompito(null)}>Annulla</button>
        </div>
      )}
      <button onClick={apriModaleCreazione}>Crea nuovo compito</button>

      {showCreateModal && (
        <div className="modal">
          <h3>Nuovo Compito</h3>
          <form onSubmit={creaNuovoCompito}>
            <label>
              Domanda:<br />
              <textarea
                value={domanda}
                onChange={(e) => setDomanda(e.target.value)}
                required
                rows={3}
              />
            </label>
            <br /><br />
            <label>Seleziona studenti (2-6):</label><br />
            {studentiDisponibili.map(s => (
              <label key={s.id}>
                <input
                  type="checkbox"
                  value={s.id}
                  checked={studentiSelezionati.includes(s.id)}
                  onChange={(e) => {
                    const id = s.id;
                    if (e.target.checked) {
                      setStudentiSelezionati([...studentiSelezionati, id]);
                    } else {
                      setStudentiSelezionati(studentiSelezionati.filter(sid => sid !== id));
                    }
                  }}
                />
                {s.nome} {s.cognome}
              </label>
            ))}
            <br /><br />
            <button type="submit">Crea</button>
            <button type="button" onClick={() => setShowCreateModal(false)}>Annulla</button>
          </form>
        </div>
      )}

    </div>
  );
}

export default DocentePage;
