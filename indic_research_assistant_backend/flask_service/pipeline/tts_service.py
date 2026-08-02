import os
from sarvamai import SarvamAI
import base64


SARVAM_API_KEY = os.getenv('SARVAM_API_KEY')
client = SarvamAI(api_subscription_key=SARVAM_API_KEY)

def get_audio(text, language_code="hi-IN"):
    try:
        chunks = []  # ✅ reset per call — moved inside the function
        for chunk in client.text_to_speech.convert_stream(
            text=text,
            target_language_code=language_code,  # ✅ use dynamic language
            speaker="shubh",
            model="bulbul:v3",
            output_audio_codec="mp3",
        ):
            chunks.append(chunk)

        audio_bytes = b"".join(chunks)
        return base64.b64encode(audio_bytes).decode("utf-8")  # ✅ base64 for JSON transport

    except Exception as e:
        print("error", str(e))
        return None

