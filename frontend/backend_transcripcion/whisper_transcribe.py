# frontend/backend_transcripcion/whisper_transcribe.py
import argparse
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import whisper


def preprocess_to_wav(input_path: Path, ffmpeg_bin: str) -> Path:
    tmp_dir = Path(tempfile.mkdtemp(prefix="whisper_"))
    out_wav = tmp_dir / "audio_clean.wav"

    # En Windows empaquetado pasaremos un path absoluto.
    # En dev se usará "ffmpeg" (PATH).
    if ffmpeg_bin != "ffmpeg" and not Path(ffmpeg_bin).exists():
        raise RuntimeError(f"ffmpeg not found at: {ffmpeg_bin}")

    cmd = [
        ffmpeg_bin,
        "-y",
        "-i",
        str(input_path),
        "-af",
        "highpass=f=80,lowpass=f=8000,loudnorm",
        "-ar",
        "16000",
        "-ac",
        "1",
        str(out_wav),
    ]

    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"ffmpeg failed:\n{p.stderr}")

    return out_wav


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("audio_path", help="Path to audio file")
    parser.add_argument(
        "--ffmpeg",
        default="ffmpeg",
        help="Path to ffmpeg binary (e.g. C:\\...\\ffmpeg.exe)",
    )
    args = parser.parse_args()

    audio_path = Path(args.audio_path).expanduser().resolve()
    if not audio_path.exists():
        print(
            json.dumps(
                {"ok": False, "error": f"File not found: {audio_path}"},
                ensure_ascii=False,
            )
        )
        sys.exit(1)

    model_name = "medium"  # máxima precisión sin exagerar; opcional: "large-v3"
    prompt = (
        "Transcripción para tesis. Español neutro, claro y formal. "
        "Tema: discapacidad visual en mujeres, accesibilidad, evaluación, "
        "diagnóstico, agudeza visual, baja visión, ceguera, inclusión. "
        "No inventes palabras. Si algo no se entiende, marca: [inaudible]. "
        "Usa puntuación y párrafos."
    )

    t0 = time.time()

    try:
        clean_wav = preprocess_to_wav(audio_path, args.ffmpeg)
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(2)

    model = whisper.load_model(model_name)

    result = model.transcribe(
        str(clean_wav),
        language="es",
        temperature=0.0,
        condition_on_previous_text=False,
        initial_prompt=prompt,
    )

    payload = {
        "ok": True,
        "model": model_name,
        "took_sec": round(time.time() - t0, 2),
        "text": (result.get("text") or "").strip(),
        "segments": result.get("segments", []),
    }

    print(json.dumps(payload, ensure_ascii=False))


if __name__ == "__main__":
    main()