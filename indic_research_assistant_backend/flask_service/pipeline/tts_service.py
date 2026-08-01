

from sarvamai import SarvamAI
client = SarvamAI(api_subscription_key="YOUR_SARVAM_API_KEY")
chunks = []
def get_audio(text):
    try:
        for chunk in client.text_to_speech.convert_stream(
            text=text,
            language_code="hi-IN",
            speaker="shubh",
            model="bulbul:v3",
            output_audio_codec="mp3",
                ):
        
              chunks.append(chunk)
        
        return b"".join(chunks)
    
    except Exception as e:
         print("error", str(e))