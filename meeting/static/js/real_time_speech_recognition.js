let isRecording = false;
let ws;
let audioContext;
let mediaStreamSource;
let audioWorkletNode;
let recordingInterval;
let audioChunks = [];

async function startRecording() {
    console.log('startRecording function called');
    try {
        if (!audioContext) {
            await setupAudioProcessing();
        }
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            await connectWebSocket();
        }
        if (ws.readyState === WebSocket.OPEN) {
            isRecording = true;
            audioChunks = [];
            audioWorkletNode.port.postMessage({ command: 'startRecording' });
            console.log('Recording started');
            updateStatus("正在擷獲語音並發送給Google...");
            
            // 每10秒发送一次音频数据
            recordingInterval = setInterval(() => {
                if (audioChunks.length > 0) {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    sendAudioToServer(audioBlob);
                    audioChunks = [];
                }
            }, 10000);
        } else {
            throw new Error('WebSocket not open, cannot start recording');
        }
    } catch (error) {
        console.error('Error starting recording:', error);
        updateStatus("無法開始錄音：" + error.message, true);
    }
}

async function setupAudioProcessing() {
    console.log('Setting up audio processing...');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone access granted');

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        await audioContext.audioWorklet.addModule('/static/js/processor.js');

        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        audioWorkletNode = new AudioWorkletNode(audioContext, 'my-audio-processor');

        mediaStreamSource.connect(audioWorkletNode);
        audioWorkletNode.connect(audioContext.destination);

        audioWorkletNode.port.onmessage = (event) => {
            if (event.data.type === 'audioData') {
                console.log(`捕获音频数据: ${event.data.size} 字节`);
                if (isRecording) {
                    audioChunks.push(event.data.buffer);
                }
            }
        };

        console.log('Audio processing setup complete');
    } catch (error) {
        console.error('Error accessing microphone:', error);
        updateStatus("無法存取麥克風：" + error.message, true);
        throw error;
    }
}

function stopRecording() {
    console.log('stopRecording function called');
    isRecording = false;
    clearInterval(recordingInterval);
    if (audioWorkletNode) {
        audioWorkletNode.port.postMessage({ command: 'stopRecording' });
    }
    console.log('Recording stopped');
    updateStatus("語音擷取已停止");

    if (audioChunks.length > 0) {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        sendAudioToServer(audioBlob);
        audioChunks = [];
    }

    if (audioWorkletNode) {
        audioWorkletNode.disconnect();
    }
    if (mediaStreamSource) {
        mediaStreamSource.disconnect();
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
    }
}

function sendAudioToServer(audioBlob) {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');

    fetch('/process_audio/', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log('Transcription result:', data.transcript);
        updateTranscript(data.transcript);
    })
    .catch(error => {
        console.error('Error sending audio to server:', error);
    });
}

function connectWebSocket() {
    return new Promise((resolve, reject) => {
        const meetingId = document.getElementById('meeting-id').value;
        console.log('Connecting WebSocket for meeting:', meetingId);
        ws = new WebSocket(`ws://${window.location.host}/ws/speech/${meetingId}/`);

        ws.onopen = () => {
            console.log('WebSocket connection established');
            updateStatus("WebSocket 連線成功");
            resolve();
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'transcription') {
                updateTranscript(data.text);
                console.log(`Received transcription: ${data.text}`);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            updateStatus("WebSocket 連線錯誤，請重試。", true);
            reject(error);
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
            updateStatus("WebSocket 連結已斷開。");
            if (isRecording) {
                stopRecording();
            }
        };
    });
}

function updateTranscript(text) {
    console.log('Updating transcript:', text);
    const transcriptElement = document.getElementById('transcript');
    transcriptElement.innerHTML += text + '<br>';
    transcriptElement.scrollTop = transcriptElement.scrollHeight;
}

function updateStatus(message, isError = false) {
    console.log(isError ? `Error: ${message}` : message);
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.color = isError ? 'red' : 'black';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, initializing...');
    document.getElementById('start-recording').addEventListener('click', startRecording);
    document.getElementById('stop-recording').addEventListener('click', stopRecording);
    console.log('Event listeners added');
});
