type Props = {
  kickedBy: string;
  onRejoin: () => void;
};

export function KickedScreen({ kickedBy, onRejoin }: Props) {
  return (
    <main className="kicked animate-fade-in-up">
      <div className="kicked-card">
        <span className="kicked-icon" aria-hidden="true">
          👋
        </span>
        <h1>Te sacaron de la sala</h1>
        <p className="kicked-text">
          Un administrador (<strong>{kickedBy}</strong>) te sacó del chat.
          <br />
          Puedes volver a entrar cuando quieras.
        </p>
        <button type="button" className="join-button" onClick={onRejoin}>
          Volver a entrar
        </button>
      </div>
    </main>
  );
}
