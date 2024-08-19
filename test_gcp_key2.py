import os
from google.cloud import speech

# 設置 Google Cloud 憑證
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"D:\BackupData\shane\Desktop\meeting\django-server-30-429202-4d4ce05e3a9b.json"

def test_speech_to_text():
    client = speech.SpeechClient()

    audio_file_path = r"D:\BackupData\shane\Desktop\meeting\record18.wav"
    
    if not os.path.exists(audio_file_path):
        print(f"Error: The file {audio_file_path} does not exist.")
        return

    with open(audio_file_path, "rb") as audio_file:
        content = audio_file.read()

    audio = speech.RecognitionAudio(content=content)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=48000,  # 更新為48000 Hz
        language_code="zh-TW",
    )

    print("Calling Google Speech-to-Text API...")
    response = client.recognize(config=config, audio=audio)

    print(f"Received {len(response.results)} results")
    for result in response.results:
        print(f"Transcript: {result.alternatives[0].transcript}")

if __name__ == "__main__":
    test_speech_to_text()