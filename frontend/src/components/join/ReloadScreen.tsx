export function ReloadScreen() {
  return (
    <main className="join">
      <div className="join-card" style={{ textAlign: "center" }}>
        <h1>Chat Grupal</h1>
        <p className="join-hint">
          No se pudo establecer conexión con el servidor.
        </p>
        <button
          className="join-button"
          onClick={() => window.location.reload()}
        >
          Recargar página
        </button>
      </div>
    </main>
  );
}
