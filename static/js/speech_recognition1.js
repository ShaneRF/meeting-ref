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
        })
        .catch(error => {
            console.error('Error accessing microphone:', error);
        });
}

function startRecording() {
    console.log('startRecording function called');
    if (!mediaRecorder) {
        console.log('MediaRecorder not set up, initializing...');
        setupMediaRecorder();
    }
    isRecording = true;
    audioChunks = [];
    mediaRecorder.start();
    console.log('Recording started');
}

function stopRecording() {
    console.log('stopRecording function called');
    if (isRecording) {
        isRecording = false;
        mediaRecorder.stop();
        console.log('Recording stopped');
    } else {
        console.log('Not recording, stop ignored');
    }
}

function sendAudioToServer() {
    console.log('Sending audio to server...');
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    console.log('Audio blob created, size:', audioBlob.size);
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = function() {
        const base64Audio = reader.result.split(',')[1];
        console.log('Audio converted to base64, length:', base64Audio.length);
        fetch('/transcribe/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ audio: base64Audio }),
        })
        .then(response => {
            console.log('Server response received:', response.status);
            return response.json();
        })
        .then(data => {
            if (data.transcript) {
                console.log('Transcript received:', data.transcript);
                sendTranscriptToWebSocket(data.transcript);
            } else {
                console.log('No transcript in response');
            }
        })
        .catch(error => console.error('Error sending audio to server:', error));
    };
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

function sendTranscriptToWebSocket(transcript) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('Sending transcript to WebSocket:', transcript);
        ws.send(JSON.stringify({
            type: 'transcription',
            text: transcript
        }));
    } else {
        console.log('WebSocket not open, transcript not sent');
    }
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
    setupMediaRecorder();

    document.getElementById('start-recording').addEventListener('click', startRecording);
    document.getElementById('stop-recording').addEventListener('click', stopRecording);
    console.log('Event listeners added');
});