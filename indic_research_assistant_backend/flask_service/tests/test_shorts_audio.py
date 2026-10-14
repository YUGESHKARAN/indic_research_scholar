import base64
import io
import json
import os
import tempfile
import unittest
import wave
from types import SimpleNamespace
from unittest.mock import Mock, patch

from flask import Flask

from sarvam_integration import shorts_audio


def make_wav(duration_seconds=1):
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(8000)
        audio.writeframes(b"\x00\x00" * 8000 * duration_seconds)
    return buffer.getvalue()


class ShortsAudioRouteTests(unittest.TestCase):
    def setUp(self):
        app = Flask(__name__)
        app.register_blueprint(shorts_audio.shorts_audio_bp)
        self.client = app.test_client()
        self.internal_key_patch = patch.object(shorts_audio, "INTERNAL_API_KEY", "test-key")
        self.internal_key_patch.start()
        self.addCleanup(self.internal_key_patch.stop)

    def post_audio(self, payload, key="test-key"):
        return self.client.post(
            "/api/shorts/audio/generate",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"x-internal-key": key},
        )

    def test_requires_internal_key(self):
        response = self.post_audio(
            {"script": "A long enough script", "language": "hindi", "shortId": "123"},
            key="wrong-key",
        )
        self.assertEqual(response.status_code, 401)

    def test_validates_language_script_and_uuid_without_calling_sarvam(self):
        convert = Mock()
        mock_client = SimpleNamespace(text_to_speech=SimpleNamespace(convert=convert))
        invalid_payloads = [
            {"script": "short", "language": "hindi", "shortId": "123"},
            {"script": "A long enough script", "language": "unsupported", "shortId": "123"},
            {"script": "A long enough script", "language": "hindi", "shortId": "not-a-uuid"},
            {
                "script": "x" * (shorts_audio.MAX_SCRIPT_CHARACTERS + 1),
                "language": "hindi",
                "shortId": "123e4567-e89b-12d3-a456-426614174000",
            },
        ]
        with patch.object(shorts_audio, "sarvam_client", mock_client):
            for payload in invalid_payloads:
                with self.subTest(payload=payload):
                    response = self.post_audio(payload)
                    self.assertIn(response.status_code, (400, 413))
        convert.assert_not_called()

    def test_splits_long_scripts_to_provider_limit_and_combines_wav_chunks(self):
        short_id = "123e4567-e89b-12d3-a456-426614174000"
        script = "A context-aware voice matters. " + ("Everyday speech needs context. " * 90)
        audio = base64.b64encode(make_wav()).decode("ascii")
        convert = Mock(return_value=SimpleNamespace(audios=[audio]))
        mock_client = SimpleNamespace(text_to_speech=SimpleNamespace(convert=convert))
        with tempfile.TemporaryDirectory() as storage_root:
            with patch.dict(os.environ, {"SHORTS_STORAGE_PATH": storage_root}):
                with patch.object(shorts_audio, "sarvam_client", mock_client):
                    response = self.post_audio({
                        "script": script,
                        "language": "hindi",
                        "shortId": short_id,
                    })

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json()["duration"], 2.0)
            with open(
                os.path.join(storage_root, "audio", f"{short_id}_hindi.wav"),
                "rb",
            ) as audio_file:
                with wave.open(audio_file, "rb") as combined_audio:
                    self.assertEqual(combined_audio.getnframes(), 16000)

        self.assertEqual(convert.call_count, 2)
        self.assertTrue(
            all(
                len(call.kwargs["text"]) <= shorts_audio.MAX_TTS_REQUEST_CHARACTERS
                for call in convert.call_args_list
            )
        )

    def test_generates_and_atomically_stores_wav(self):
        short_id = "123e4567-e89b-12d3-a456-426614174000"
        audio_bytes = make_wav()
        convert = Mock(return_value=SimpleNamespace(
            audios=[base64.b64encode(audio_bytes).decode("ascii")]
        ))
        mock_client = SimpleNamespace(text_to_speech=SimpleNamespace(convert=convert))
        with tempfile.TemporaryDirectory() as storage_root:
            with patch.dict(os.environ, {"SHORTS_STORAGE_PATH": storage_root}):
                with patch.object(shorts_audio, "sarvam_client", mock_client):
                    response = self.post_audio({
                        "script": "A valid script with enough text.",
                        "language": "tamil",
                        "shortId": short_id,
                    })
            self.assertEqual(response.status_code, 200)
            body = response.get_json()
            self.assertEqual(body["audioFile"], f"audio/{short_id}_tamil.wav")
            self.assertEqual(body["language"], "tamil")
            self.assertEqual(body["duration"], 1.0)
            audio_path = os.path.join(storage_root, body["audioFile"])
            with open(audio_path, "rb") as audio_file:
                self.assertEqual(audio_file.read(), audio_bytes)
            convert.assert_called_once_with(
                text="A valid script with enough text.",
                language_code="ta-IN",
                speaker="gokul_ta_narration",
                model="bulbul:v4-flash",
                output_audio_codec="wav",
            )

    def test_maps_all_supported_languages_to_sarvam_locales(self):
        language_codes = {
            "english": "en-IN",
            "hindi": "hi-IN",
            "tamil": "ta-IN",
            "telugu": "te-IN",
            "kannada": "kn-IN",
            "malayalam": "ml-IN",
            "bengali": "bn-IN",
            "marathi": "mr-IN",
            "gujarati": "gu-IN",
        }
        audio = base64.b64encode(make_wav()).decode("ascii")
        convert = Mock(return_value=SimpleNamespace(audios=[audio]))
        mock_client = SimpleNamespace(text_to_speech=SimpleNamespace(convert=convert))
        with tempfile.TemporaryDirectory() as storage_root:
            with patch.dict(os.environ, {"SHORTS_STORAGE_PATH": storage_root}):
                with patch.object(shorts_audio, "sarvam_client", mock_client):
                    for language in language_codes:
                        response = self.post_audio({
                            "script": "A valid script with enough text.",
                            "language": language,
                            "shortId": "123e4567-e89b-12d3-a456-426614174000",
                        })
                        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [call.kwargs["language_code"] for call in convert.call_args_list],
            list(language_codes.values()),
        )
        self.assertEqual(
            [
                (call.kwargs["model"], call.kwargs["speaker"])
                for call in convert.call_args_list
            ],
            [shorts_audio.TTS_VOICES[language] for language in language_codes],
        )
        self.assertEqual(
            shorts_audio.TTS_VOICES["english"],
            ("bulbul:v4-flash", "girish_en_documentary"),
        )

    def test_returns_explicit_error_when_sarvam_fails(self):
        mock_client = SimpleNamespace(
            text_to_speech=SimpleNamespace(convert=Mock(side_effect=RuntimeError("provider error")))
        )
        with patch.object(shorts_audio, "sarvam_client", mock_client):
            response = self.post_audio({
                "script": "A valid script with enough text.",
                "language": "hindi",
                "shortId": "123e4567-e89b-12d3-a456-426614174000",
            })
        self.assertEqual(response.status_code, 502)
        self.assertIn("error", response.get_json())

    def test_returns_actionable_error_for_sarvam_validation_failure(self):
        error = RuntimeError("invalid speaker configuration")
        error.status_code = 400
        mock_client = SimpleNamespace(
            text_to_speech=SimpleNamespace(convert=Mock(side_effect=error))
        )
        with patch.object(shorts_audio, "sarvam_client", mock_client):
            response = self.post_audio({
                "script": "A valid script with enough text.",
                "language": "hindi",
                "shortId": "123e4567-e89b-12d3-a456-426614174000",
            })

        self.assertEqual(response.status_code, 502)
        self.assertIn("voice configuration", response.get_json()["error"])

    def test_rejects_invalid_sarvam_wav_response(self):
        mock_client = SimpleNamespace(
            text_to_speech=SimpleNamespace(
                convert=Mock(return_value=SimpleNamespace(audios=["not-base64"]))
            )
        )
        with patch.object(shorts_audio, "sarvam_client", mock_client):
            response = self.post_audio({
                "script": "A valid script with enough text.",
                "language": "hindi",
                "shortId": "123e4567-e89b-12d3-a456-426614174000",
            })
        self.assertEqual(response.status_code, 502)
        self.assertFalse(response.get_json().get("success", False))


if __name__ == "__main__":
    unittest.main()
