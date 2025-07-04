import {
  Container, Button, Card, Modal, Form, Row, Col
} from 'react-bootstrap';
import Navbar from '../components/Navbar';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/authContext';
import { useNavigate } from 'react-router-dom';

function DocentePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [compiti, setCompiti] = useState([]);
  const [risposteCaricate, setRisposteCaricate] = useState({});
  const [espandiRisposte, setEspandiRisposte] = useState({});
  const [selectedCompito, setSelectedCompito] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [valutazione, setValutazione] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [studentiDisponibili, setStudentiDisponibili] = useState([]);
  const [domanda, setDomanda] = useState('');
  const [studentiSelezionati, setStudentiSelezionati] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resUser = await fetch('http://localhost:3001/api/mio-nome', {
          credentials: 'include'
        });
        if (!resUser.ok) throw new Error('Errore caricamento utente');
        const datiUtente = await resUser.json();
        setUser(datiUtente);

        const res = await fetch('http://localhost:3001/api/compiti/miei', {
          credentials: 'include',
        });
        const data = await res.json();
        setCompiti(data);

        const risposte = {};
        for (const c of data) {
          if (c.haRisposta) {
            try {
              const r = await fetch(`http://localhost:3001/api/compiti/${c.compitoId}/risposta`, {
                credentials: 'include',
              });
              if (r.ok) {
                const d = await r.json();
                risposte[c.compitoId] = d.testo;
              }
            } catch (err) {
              console.error('Errore caricamento risposta:', err);
            }
          }
        }
        setRisposteCaricate(risposte);
      } catch (err) {
        console.error('Errore caricamento dati:', err);
      }
    };

    if (user?.ruolo === 'docente') fetchData();
  }, [user?.ruolo, setUser]);

  const handleValutazione = (id) => {
    const compito = compiti.find(c => c.compitoId === id);
    setSelectedCompito(compito);
    setModalMode('valuta');
  };

  const handleSubmitValutazione = async (e) => {
    e.preventDefault();
    const voto = parseInt(valutazione);
    if (isNaN(voto) || voto < 0 || voto > 30) {
      alert("Inserisci un voto valido tra 0 e 30");
      return;
    }

    try {
      await fetch(`http://localhost:3001/api/compiti/${selectedCompito.compitoId}/valutazione`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ voto }),
      });

      const updated = await fetch('http://localhost:3001/api/compiti/miei', {
        credentials: 'include',
      });
      const data = await updated.json();
      setCompiti(data);

      const risposte = {};
      for (const c of data) {
        if (c.haRisposta) {
          try {
            const r = await fetch(`http://localhost:3001/api/compiti/${c.compitoId}/risposta`, {
              credentials: 'include',
            });
            if (r.ok) {
              const d = await r.json();
              risposte[c.compitoId] = d.testo;
            }
          } catch (err) {
            console.error('Errore caricamento risposta:', err);
          }
        }
      }
      setRisposteCaricate(risposte);
      setEspandiRisposte({});
      setSelectedCompito(null);
      setModalMode(null);
      setValutazione('');
    } catch (err) {
      console.error(err);
    }
  };

  const apriModaleCreazione = async () => {
    const res = await fetch('http://localhost:3001/api/studenti', {
      credentials: 'include',
    });
    const data = await res.json();
    setStudentiDisponibili(data);
    setShowCreateModal(true);
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
        body: JSON.stringify({ domanda, studenti: studentiSelezionati }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error);
        return;
      }

      const r = await fetch('http://localhost:3001/api/compiti/miei', {
        credentials: 'include',
      });
      const compitiAggiornati = await r.json();
      setCompiti(compitiAggiornati);
      setDomanda('');
      setStudentiSelezionati([]);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Errore creazione compito:', err);
    }
  };

  const daValutare = compiti.filter(c => c.haRisposta && c.stato !== 'chiuso');
  const inAttesa = compiti.filter(c => !c.haRisposta);
  const valutati = compiti.filter(c => c.stato === 'chiuso');

  const renderCompiti = (lista, titolo) => (
    <>
      {lista.length > 0 && <h4 className="mt-4">{titolo}</h4>}
      <Row className="mb-3">
        {lista.map(c => (
          <Col md={6} lg={4} key={c.compitoId} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>{c.domanda}</Card.Title>
                <Card.Text>
                  <strong>Stato:</strong>{' '}
                  {c.stato === 'chiuso'
                    ? <>✅ Valutato – <strong>Voto:</strong> {c.voto}</>
                    : c.haRisposta
                      ? '✍️ Risposto ma non valutato'
                      : '🕓 In attesa di risposta'}
                  <br />
                  <strong>Studenti:</strong> {c.studenti.map(s => s.nome).join(', ')}
                </Card.Text>

                {c.haRisposta && risposteCaricate[c.compitoId] && (
                  <Card.Text className="mt-2">
                    <strong>Risposta del gruppo:</strong><br />
                    <span>
                      {espandiRisposte[c.compitoId]
                        ? risposteCaricate[c.compitoId]
                        : risposteCaricate[c.compitoId].slice(0, 100) + ' '}
                    </span>
                    {risposteCaricate[c.compitoId].length > 100 && (
                      <div className="mt-1">
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-decoration-none"
                          onClick={() =>
                            setEspandiRisposte(prev => ({ ...prev, [c.compitoId]: !prev[c.compitoId] }))
                          }
                        >
                          <i className={`bi ${espandiRisposte[c.compitoId] ? 'bi-chevron-up' : 'bi-three-dots'} fs-4 text-primary`} />
                        </Button>
                      </div>
                    )}
                  </Card.Text>
                )}

                {c.stato !== 'chiuso' && c.haRisposta && (
                  <Button variant="primary" size="sm" onClick={() => handleValutazione(c.compitoId)}>
                    Valuta
                  </Button>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );

  const nomeCompleto = [user?.nome, user?.cognome].filter(Boolean).join(' ') || user?.email;

  return (
    <>
      <Navbar />
      <Container
        fluid
        className="px-4 py-4"
        style={{ minHeight: '100vh', backgroundColor: '#f9f9f9' }}
      >
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Compiti creati da {nomeCompleto}</h2>
          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              onClick={() => navigate(`/stato-classe/${user?.id || user?.userId}`)}
            >
              Stato Classe
            </Button>
            <Button onClick={apriModaleCreazione}>Crea nuovo compito</Button>
          </div>
        </div>

        {renderCompiti(daValutare, '📝 Compiti da valutare')}
        {renderCompiti(inAttesa, '⏳ In attesa di risposta')}
        {renderCompiti(valutati, '✅ Compiti valutati')}

        {/* Modale Valutazione */}
        <Modal show={modalMode === 'valuta'} onHide={() => {
          setModalMode(null);
          setSelectedCompito(null);
        }}>
          <Modal.Header closeButton>
            <Modal.Title>Valuta Compito</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p><strong>Domanda:</strong> {selectedCompito?.domanda}</p>
            <Form onSubmit={handleSubmitValutazione}>
              <Form.Group>
                <Form.Label>Voto (0–30)</Form.Label>
                <Form.Control
                  type="number"
                  value={valutazione}
                  onChange={(e) => setValutazione(e.target.value)}
                  min={0}
                  max={30}
                  required
                />
              </Form.Group>
              <Button className="mt-3" type="submit">Conferma</Button>
            </Form>
          </Modal.Body>
        </Modal>

        {/* Modale Creazione Compito */}
        <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Crea Nuovo Compito</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={creaNuovoCompito}>
              <Form.Group className="mb-3">
                <Form.Label>Domanda</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={domanda}
                  onChange={(e) => setDomanda(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Seleziona studenti (2–6)</Form.Label>
                {studentiDisponibili.map(s => (
                  <Form.Check
                    key={s.id}
                    type="checkbox"
                    label={`${s.nome} ${s.cognome}`}
                    checked={studentiSelezionati.includes(s.id)}
                    onChange={(e) => {
                      const id = s.id;
                      setStudentiSelezionati(prev =>
                        e.target.checked
                          ? [...prev, id]
                          : prev.filter(sid => sid !== id)
                      );
                    }}
                  />
                ))}
              </Form.Group>
              <Button className="mt-3" type="submit">Crea</Button>
            </Form>
          </Modal.Body>
        </Modal>
      </Container>
    </>
  );
}

export default DocentePage;
