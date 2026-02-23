import { useState } from "react";

function App() {
  const [filePath, setFilePath] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState("");

  const pick = async () => {
    setError("");
    const p = await window.app.pickAudio();
    if (p) setFilePath(p);
  };

  const transcribe = async () => {
    if (!filePath) return;
    setLoading(true);
    setError("");
    setText("");
    setMeta(null);

    const res = await window.app.transcribeFile(filePath);

    setLoading(false);

    if (!res?.ok) {
      setError(
        `${res?.error || "Error desconocido"}\n\nSTDERR:\n${
          res?.stderr || ""
        }\n\nSTDOUT:\n${res?.stdout || ""}`,
      );
      console.log("Detalles:", res);
      return;
    }

    setText(res.text || "");
    setMeta({ model: res.model, took_sec: res.took_sec });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold">Transcriptor local</h1>

        <div className="flex gap-3 flex-wrap">
          <button
            className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700"
            onClick={pick}
          >
            Elegir audio
          </button>

          <button
            className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
            onClick={transcribe}
            disabled={!filePath || loading}
          >
            {loading ? "Transcribiendo..." : "Transcribir"}
          </button>
        </div>

        {filePath && (
          <div className="text-sm text-zinc-300 break-all">
            Archivo: {filePath}
          </div>
        )}

        {meta && (
          <div className="text-sm text-zinc-300">
            Modelo: {meta.model} · Tiempo: {meta.took_sec}s
          </div>
        )}

        {error && (
          <div className="text-sm text-red-300 bg-red-950/40 p-3 rounded">
            {error}
          </div>
        )}

        <textarea
          className="w-full h-105 rounded bg-zinc-900 border border-zinc-800 p-3"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Aquí aparecerá la transcripción…"
        />
      </div>
    </div>
  );
}

export default App;
