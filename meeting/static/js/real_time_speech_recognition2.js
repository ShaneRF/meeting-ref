let isRecording = false;
let ws;
let audioContext;
let mediaStreamSource;
let audioWorkletNode;

async function setupAudioProcessing() {
    console.log('Setting up audio processing...');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone access granted');

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        await audioContext.audioWorklet.addModule('/static/js/processor.js'); // 确保路径正确

        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        audioWorkletNode = new AudioWorkletNode(audioContext, 'my-audio-processor');

        mediaStreamSource.connect(audioWorkletNode);
        audioWorkletNode.connect(audioContext.destination);

        // 设置全局变量
        globalThis.isRecording = isRecording;
        globalThis.ws = ws;

        console.log('Audio processing setup complete');
    } catch (error) {
        console.error('Error accessing microphone:', error);
        document.getElementById('recording-status').textContent = "無法麥克風：" + error.message;
    }
}

function startRecording() {
    console.log('startRecording function called');
    if (!audioContext) {
        setupAudioProcessing();
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        connectWebSocket();
    }

    ws.onopen = () => {
        console.log('WebSocket connected successfully');
        document.getElementById('websocket-status').textContent = "WebSocket 連接成功";

        isRecording = true;
        globalThis.isRecording = isRecording;
        console.log('Recording started');
        document.getElementById('recording-status').textContent = "正在擷獲語音並發送給Google...";
    };
}

function stopRecording() {
    console.log('stopRecording function called');
    isRecording = false;
    globalThis.isRecording = isRecording;
    console.log('Recording stopped');
    document.getElementById('recording-status').textContent = "語音纈取已停止";

    if (ws) {
        ws.close();
    }
}

function connectWebSocket() {
    const meetingId = document.getElementById('meeting-id').value;
    console.log('Connecting WebSocket for meeting:', meetingId);
    ws = new WebSocket(`ws://${window.location.host}/ws/speech/${meetingId}/`);

    ws.onopen = () => {
        console.log('WebSocket connected successfully');
        document.getElementById('websocket-status').textContent = "WebSocket 連接成功";
    };

    ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        const data = JSON.parse(event.data);
        if (data.type === 'transcription') {
            updateTranscript(data.text);
            // 打印返回的文字内容及容量
            console.log(`Received text: ${data.text}`);
            console.log(`Received data size: ${new Blob([event.data]).size} bytes`);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // 顯示錯誤信息在UI中
        document.getElementById('websocket-status').textContent = "WebSocket 連接錯誤，請重試。";
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        // 顯示WebSocket斷開訊息在UI中
        document.getElementById('websocket-status').textContent = "WebSocket 連結已斷開。";
    };

    globalThis.ws = ws;
}

function updateTranscript(text) {   
    console.log('Updating transcript with:', text);
    const transcriptElement = document.getElementById('transcript');
    transcriptElement.innerHTML += text + '<br>';
    transcriptElement.scrollTop = transcriptElement.scrollHeight;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, initializing...');
    
    document.getElementById('start-recording').addEventListener('click', startRecording);
    document.getElementById('stop-recording').addEventListener('click', stopRecording);
    console.log('Event listeners added');
});
