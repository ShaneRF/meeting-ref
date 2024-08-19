let isRecording = false;
let mediaRecorder;
let audioChunks = [];
let recordingInterval;

function setupMediaRecorder() {
    console.log('正在設置 MediaRecorder...');
    navigator.mediaDevices.getUserMedia({ 
        audio: {
            channelCount: 1,
            sampleRate: 48000,
            sampleSize: 16,
            volume: 1
        }
    })
    .then(stream => {
        console.log('授予麥克風訪問權限');
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 128000
        });
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
            console.log('音頻數據塊已接收，大小：', event.data.size);
        };
        console.log('MediaRecorder 設置完成');
    })
    .catch(error => {
        console.error('訪問麥克風時出錯：', error);
        updateStatus('無法訪問麥克風：' + error.message, true);
    });
}

function startRecording() {
    console.log('startRecording 函数被調用');
    if (!mediaRecorder) {
        setupMediaRecorder();
        updateStatus('正在設置 MediaRecorder...');
        return;
    }
    if (isRecording) {
        console.log('已在錄音，忽略开始指令');
        return;
    }
    isRecording = true;
    audioChunks = [];
    mediaRecorder.start();
    console.log('錄音開始');
    updateStatus('錄音開始');

    // 每10秒发送一次音频数据
    recordingInterval = setInterval(() => {
        if (isRecording) {
            sendAudioToServer();
            audioChunks = []; // 清空音频块，准备下一次10秒
        }
    }, 10000);
}

function stopRecording() {
    console.log('stopRecording 函数被調用');
    if (isRecording) {
        isRecording = false;
        clearInterval(recordingInterval);
        mediaRecorder.stop();
        console.log('錄音停止');
        updateStatus('錄音停止');

        // 发送剩余的音频数据
        mediaRecorder.onstop = () => {
            sendAudioToServer(true);
        };
    } else {
        console.log('未在錄音，忽略停止指令');
        updateStatus('未在錄音，忽略停止指令');
    }
}

function sendAudioToServer(isFinal = false) {
    if (audioChunks.length === 0) return;

    console.log('正在發送音頻到服務器...');
    updateStatus('正在發送音頻到服務器...');
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    console.log('已創建音頻 blob，大小：', audioBlob.size);
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.webm');

    const csrftoken = getCookie('csrftoken');

    fetch('/process_audio/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': csrftoken
        }
    })
    .then(response => {
        console.log('收到服務器響應:', response.status);
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log('收到轉錄文本:', data.transcript);
            console.log('音頻文件保存路徑:', data.file_path);
            console.log('转录文件名:', data.transcript_file);
            
            // 使用當前時間作為時間戳
            const now = new Date();
            const formattedTimestamp = new Intl.DateTimeFormat('zh-TW', {
                timeZone: 'Asia/Taipei',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false  // 使用24小時制
            }).format(now);

            // 直接在這裡更新 transcript
            const transcriptElement = document.getElementById('transcript');
            if (transcriptElement) {
                const newTranscript = `<p><strong>[${formattedTimestamp}]</strong> ${data.transcript}</p>`;
                transcriptElement.innerHTML += newTranscript;
                transcriptElement.scrollTop = transcriptElement.scrollHeight;
                console.log('已更新轉錄文本:', newTranscript);
            } else {
                console.error('找不到 transcript 元素');
            }

            updateStatus('轉錄完成');
        } else {
            console.log('轉錄失敗');
            console.log('音頻文件保存路徑:', data.file_path);
            updateStatus('服務器未返回結果', true);
        }
    })
    .catch(error => {
        console.error('發送音頻到服務器時出錯：', error);
        updateStatus('發送音頻到服務器時出錯: ' + error.message, true);
    });

    if (!isFinal) {
        audioChunks = []; // 清空音頻塊，准備下一次10秒
    }
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function connectWebSocket() {
    const meetId = document.getElementById('meeting-id').value;
    console.log('正在连接 WebSocket 進行會議：', meetId);
    const ws = new WebSocket(`ws://${window.location.host}/ws/speech/${meetId}/`);

    ws.onopen = () => {
        console.log('WebSocket 連接成功');
        updateStatus('WebSocket連接成功');
    };

    ws.onmessage = (event) => {
        console.log('收到WebSocket消息：', event.data);
        const data = JSON.parse(event.data);
        if (data.type === 'transcription') {
            updateTranscript(data.text);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket 錯誤：', error);
        updateStatus('WebSocket錯誤：' + error.message, true);
    };

    ws.onclose = () => {
        console.log('WebSocket 已斷開');
        updateStatus('WebSocket連接已斷開');
    };
}

function sendTranscriptToWebSocket(transcript) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('發送轉錄文本到 WebSocket:', transcript);
        ws.send(JSON.stringify({ type: 'transcription', text: transcript }));
    } else {
        console.log('WebSocket 未連接，未發送轉錄文本');
        updateStatus('WebSocket 未連接，無法發送结果', true);
    }
}

function updateTranscript(text) {
    console.log('更新轉錄文本：', text);
    const transcriptElement = document.getElementById('transcript');
    transcriptElement.innerHTML += text + '<br>';
    transcriptElement.scrollTop = transcriptElement.scrollHeight;
}

function updateStatus(message, isError = false) {
    console.log(isError ? '錯誤: ' + message : message);
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.style.color = isError ? 'red' : 'black';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 内容已加載，正在初始化...');
    connectWebSocket();
    setupMediaRecorder();

    document.getElementById('start-recording').addEventListener('click', startRecording);
    document.getElementById('stop-recording').addEventListener('click', stopRecording);
    console.log('已添加事件監聽器');
    updateStatus('頁面加載完成，等待操作');
});
