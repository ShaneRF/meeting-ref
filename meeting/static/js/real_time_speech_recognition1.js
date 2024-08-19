let isRecording = false;
let ws;
let audioContext;
let mediaStreamSource;
let processor;

function setupAudioProcessing() {
    console.log('Setting up audio processing...');
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            console.log('Microphone access granted');
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            mediaStreamSource = audioContext.createMediaStreamSource(stream);
            processor = audioContext.createScriptProcessor(1024, 1, 1);
            
            mediaStreamSource.connect(processor);
            processor.connect(audioContext.destination);
            
            processor.onaudioprocess = processAudioEvent;
            console.log('Audio processing setup complete');
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
        });
}

function processAudioEvent(e) {
    if (isRecording && ws && ws.readyState === WebSocket.OPEN) {
        const audioData = e.inputBuffer.getChannelData(0);
        const dataArray = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
            dataArray[i] = Math.max(-1, Math.min(1, audioData[i])) * 0x7FFF;
        }
        ws.send(dataArray.buffer);
    }
}

function startRecording() {
    console.log('startRecording function called');
    if (!audioContext) {
        setupAudioProcessing();
    }
    isRecording = true;
    console.log('Recording started');
}

function stopRecording() {
    console.log('stopRecording function called');
    isRecording = false;
    console.log('Recording stopped');
}

function connectWebSocket() {
    const meetingId = document.getElementById('meeting-id').value;
    console.log('Connecting WebSocket for meeting:', meetingId);
    ws = new WebSocket(`ws://${window.location.host}/ws/speech/${meetingId}/`);

    ws.onopen = () => {
        console.log('WebSocket connected successfully');
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
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
    };
}

function updateTranscript(text) {   
    console.log('Updating transcript with:', text);
    const transcriptElement = document.getElementById('transcript');
    transcriptElement.innerHTML += text + '<br>';
    transcriptElement.scrollTop = transcriptElement.scrollHeight;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded, initializing...');
    connectWebSocket();
    setupAudioProcessing();

    document.getElementById('start-recording').addEventListener('click', startRecording);
    document.getElementById('stop-recording').addEventListener('click', stopRecording);
    console.log('Event listeners added');
});