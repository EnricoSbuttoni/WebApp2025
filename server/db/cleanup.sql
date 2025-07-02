PRAGMA foreign_keys = OFF;

DELETE FROM Valutazione;
DELETE FROM Risposta;
DELETE FROM StudenteGruppo;
DELETE FROM Gruppo;
DELETE FROM Compito;
DELETE FROM Studente;
DELETE FROM Docente;
DELETE FROM Utente;

DELETE FROM sqlite_sequence;

PRAGMA foreign_keys = ON;
