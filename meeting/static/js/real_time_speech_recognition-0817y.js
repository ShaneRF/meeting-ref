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
        await audioContext.audioWorklet.addModule('/static/js/processor.js'); // 確認路徑正確

        mediaStreamSource = audioContext.createMediaStreamSource(stream);
        audioWorkletNode = new AudioWorkletNode(audioContext, 'my-audio-processor');

        mediaStreamSource.connect(audioWorkletNode);
        audioWorkletNode.connect(audioContext.destination);

        // 設置全局
        globalThis.isRecording = isRecording;
        globalThis.ws = ws;

        console.log('Audio processing setup complete');
    } catch (error) {
        console.error('Error accessing microphone:', error);
        document.getElementById('recording-status').textContent = "無法麥克風：" + error.message;
    }
}

async function startRecording() {
    console.log('startRecording function called');
    if (!audioContext) {
        await setupAudioProcessing();
    }

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        await connectWebSocket();
    }

    if (ws.readyState === WebSocket.OPEN) {
        isRecording = true;
        globalThis.isRecording = isRecording;
        console.log('Recording started');
        document.getElementById('recording-status').textContent = "正在擷獲語音並發送給Google...";
    } else {
        console.error('WebSocket not open, cannot start recording');
        document.getElementById('recording-status').textContent = "無法開始錄音：WebSocket未連接";
    }
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
    return new Promise((resolve, reject) => {
        const meetingId = document.getElementById('meeting-id').value;
        console.log('Connecting WebSocket for meeting:', meetingId);

        ws = new WebSocket(`ws://${window.location.host}/ws/speech/${meetingId}/`);
    
        const timeout = setTimeout(() => {
            reject(new Error('WebSocket connection timeout'));
        }, 5000); // 5秒超时

        ws.onopen = () => {
            clearTimeout(timeout);
            console.log('WebSocket connected successfully');
            document.getElementById('websocket-status').textContent = "WebSocket 連接成功";
            resolve();
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
            clearTimeout(timeout);
            console.error('WebSocket error:', error);
            // 顯示錯誤信息在UI中
            document.getElementById('websocket-status').textContent = "WebSocket 連接錯誤，請重試。";
            reject(error);
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            // 顯示WebSocket斷開訊息在UI中
            document.getElementById('websocket-status').textContent = "WebSocket 連結已斷開。";
            if (isRecording) {
                stopRecording();
            }
        };
    });
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

function updateStatus(message, isError = false) {
    console.log(isError ? `Error: ${message}` : message);
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.color = isError ? 'red' : 'black';
    }
}
