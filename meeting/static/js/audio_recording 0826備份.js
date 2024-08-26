let isRecording = false;
let mediaRecorder;
let audioContext;
let analyser;
let microphone;
let audioChunks = [];
let silenceTimer;
const SILENCE_THRESHOLD = -50; // 声音阈值，可以根據需要调整
const SILENCE_DURATION = 1000; // 静音持续时间，单位为毫秒
// 將最大錄音时間改為 60 秒
const MAX_RECORDING_DURATION = 20000; // 60 秒


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
        
        // 设置音频分析器
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        analyser.fftSize = 2048;
        
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus',
            audioBitsPerSecond: 128000
        });
        
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
                console.log('音頻數據塊已接收，大小：', event.data.size);
            }
        };
        
        mediaRecorder.onstop = () => {
            console.log('MediaRecorder 停止，发送音频数据');
            sendAudioToServer();
        };
        
        console.log('MediaRecorder 設置完成');
    })
    .catch(error => {
        console.error('訪問麥克風時出錯：', error);
        updateStatus('無法訪問麥克風：' + error.message, true);
    });
}

function startRecording() {
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
    updateStatus('開始檢測聲音');
    
    detectSound();
}

function stopRecording() {
    if (isRecording) {
        isRecording = false;
        if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        console.log('錄音停止');
        updateStatus('錄音停止');
    } else {
        console.log('未在錄音，忽略停止指令');
        updateStatus('未在錄音，忽略停止指令');
    }
}

function detectSound() {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let isCurrentlyRecording = false;
    let recordingStartTime;

    function checkAudioLevel() {
        if (!isRecording) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const decibels = 20 * Math.log10(average / 255);
        
        if (decibels > SILENCE_THRESHOLD) {
            if (silenceTimer) {
                clearTimeout(silenceTimer);
                silenceTimer = null;
            }
            if (!isCurrentlyRecording) {
                isCurrentlyRecording = true;
                recordingStartTime = Date.now();
                mediaRecorder.start();
                console.log('開始錄音');
            } else if (Date.now() - recordingStartTime >= MAX_RECORDING_DURATION) {
                mediaRecorder.stop();
                isCurrentlyRecording = false;
                totalRecordingTime = 0; // 重置錄音時間
                console.log('達到最大錄音時間，停止並發送');
            }
        } else {
            if (isCurrentlyRecording && !silenceTimer) {
                silenceTimer = setTimeout(() => {
                    mediaRecorder.stop();
                    isCurrentlyRecording = false;
                    console.log('檢測到靜音，停止錄音');
                }, SILENCE_DURATION);
            }
        }
        
        requestAnimationFrame(checkAudioLevel);
    }
    
    checkAudioLevel();
}

// 修改 sendAudioToServer 函数，在发送后清空 audioChunks
function sendAudioToServer() {
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
    })
    .finally(() => {
        // 清空音频块，准备下一次录音
        audioChunks = [];
    });
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

function endMeeting() {
    console.log('正在结束会议...');
    updateStatus('正在结束会议...');

    const csrftoken = getCookie('csrftoken');

    fetch('/end_meeting/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrftoken
        }
    })
    .then(response => {
        console.log('收到服务器响应:', response.status);
        return response.json();
    })
    .then(data => {
        if (data.success) {
            console.log('会议已结束');
            console.log('合并文件:', data.combined_file);
            console.log('翻译文件:', data.translated_file);
            updateStatus('会议已结束，文件已生成');
        } else {
            console.log('结束会议失败');
            updateStatus('结束会议失败: ' + data.error, true);
        }
    })
    .catch(error => {
        console.error('结束会议时出错:', error);
        updateStatus('结束会议时出错: ' + error.message, true);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 内容已加載，正在初始化...');
    connectWebSocket();
    setupMediaRecorder();

    document.getElementById('start-recording').addEventListener('click', startRecording);
    document.getElementById('stop-recording').addEventListener('click', stopRecording);
    // 新增结束会议按钮监听器
    document.getElementById('end-meeting').addEventListener('click', endMeeting);
    console.log('已添加事件監聽器');
    updateStatus('頁面加載完成，等待操作');
});
