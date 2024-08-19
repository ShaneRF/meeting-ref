let isRecording = false;
let ws;
let mediaRecorder;
let audioChunks = [];

function setupMediaRecorder() {
    console.log('Setting up MediaRecorder...');
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            console.log('Microphone access granted');
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
                console.log('Audio data chunk received, size:', event.data.size);
            };
            mediaRecorder.onstop = sendAudioToServer;
            console.log('MediaRecorder setup complete');
            updateStatus('MediaRecorder準備就緒');
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
            updateStatus('無法訪問麥克風: ' + error.message, true);
        });
}

function startRecording() {
    console.log('startRecording function called');
    if (!mediaRecorder) {
        console.log('MediaRecorder not set up, initializing...');
        setupMediaRecorder();
        updateStatus('正在設置MediaRecorder...');
        return;
    }
    if (isRecording) {
        console.log('Already recording, ignoring start command');
        return;
    }
    isRecording = true;
    audioChunks = [];
    mediaRecorder.start(10000); // 每10秒觸發一次ondataavailable事件
    console.log('Recording started');
    updateStatus('錄音開始');
}

function stopRecording() {
    console.log('stopRecording function called');
    if (isRecording) {
        isRecording = false;
        mediaRecorder.stop();
        console.log('Recording stopped');
        updateStatus('錄音停止');
    } else {
        console.log('Not recording, stop ignored');
        updateStatus('未在錄音，無需停止');
    }
}

function sendAudioToServer() {
    console.log('Sending audio to server...');
    updateStatus('正在發送音頻到服務器...');
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    console.log('Audio blob created, size:', audioBlob.size);
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');

    fetch('/transcribe/', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        console.log('Server response received:', response.status);
        return response.json();
    })
    .then(data => {
        if (data.transcript) {
            console.log('Transcript received:', data.transcript);
            updateTranscript(data.transcript);
            sendTranscriptToWebSocket(data.transcript);
            updateStatus('轉錄完成');
        } else {
            console.log('No transcript in response');
            updateStatus('服務器未返回轉錄結果', true);
        }
    })
    .catch(error => {
        console.error('Error sending audio to server:', error);
        updateStatus('發送音頻到服務器時出錯: ' + error.message, true);
    });
}

function connectWebSocket() {
    const meetingId = document.getElementById('meeting-id').value;
    console.log('Connecting WebSocket for meeting:', meetingId);
    ws = new WebSocket(`ws://${window.location.host}/ws/speech/${meetingId}/`);

    ws.onopen = () => {
        console.log('WebSocket connected successfully');
        updateStatus('WebSocket連接成功');
    };

    ws.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        const data = JSON.parse(event.data);
        if (data.type === 'transcription') {
            updateTranscript(data.text);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateStatus('WebSocket錯誤: ' + error.message, true);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        updateStatus('WebSocket連接已斷開');
    };
}

function sendTranscriptToWebSocket(transcript) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('Sending transcript to WebSocket:', transcript);
        ws.send(JSON.stringify({
            type: 'transcription',
            text: transcript
        }));
    } else {
        console.log('WebSocket not open, transcript not sent');
        updateStatus('WebSocket未連接，無法發送轉錄結果', true);
    }
}

function updateTranscript(text) {   
    console.log('Updating transcript with:', text);
    const transcriptElement = document.getElementById('transcript');
    transcriptElement.innerHTML += text + '<br>';
    transcriptElement.scrollTop = transcriptElement.scrollHeight;
}

function updateStatus(message, isError = false) {
    console.log(isError ? 'Error: ' + message : message);
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.color = isError ? 'red' : 'black';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, initializing...');
    connectWebSocket();
    setupMediaRecorder();

    document.getElementById('start-recording').addEventListener('click', startRecording);
    document.getElementById('stop-recording').addEventListener('click', stopRecording);
    console.log('Event listeners added');
    updateStatus('頁面加載完成，等待操作');
});