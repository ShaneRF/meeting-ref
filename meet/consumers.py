import json
from channels.generic.websocket import AsyncWebsocketConsumer
from google.cloud import speech
import asyncio

class SpeechConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.meeting_id = self.scope['url_route']['kwargs']['meeting_id']
        self.room_group_name = f'speech_{self.meeting_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        self.client = speech.SpeechClient()
        self.config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=48000,
            language_code="zh-TW",
        )
        self.streaming_config = speech.StreamingRecognitionConfig(
            config=self.config,
            interim_results=True
        )

        self.audio_queue = asyncio.Queue()
        self.listen_task = None

        await self.accept()
        print(f"WebSocket connected: {self.room_group_name}")

    async def disconnect(self, close_code):
        if self.listen_task:
            self.listen_task.cancel()
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, bytes_data):
        await self.audio_queue.put(bytes_data)
        if not self.listen_task:
            self.listen_task = asyncio.create_task(self.listen_to_audio())

    async def listen_to_audio(self):
        async def audio_generator():
            while True:
                chunk = await self.audio_queue.get()
                yield speech.StreamingRecognizeRequest(audio_content=chunk)

        try:
            requests = audio_generator()
            responses = await self.client.streaming_recognize(self.streaming_config, requests.__aiter__())

            async for response in responses:
                if not response.results:
                    continue

                result = response.results[0]
                if result.is_final:
                    transcript = result.alternatives[0].transcript
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'speech_message',
                            'message': {'type': 'transcription', 'text': transcript}
                        }
                    )
        except Exception as e:
            print(f"Error in speech recognition: {str(e)}")
            import traceback
            traceback.print_exc()

    async def speech_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps(message))
    async def receive(self, bytes_data):
        print(f"接收到音频数据: {len(bytes_data)} 字节")
        await self.audio_queue.put(bytes_data)