class MyAudioProcessor extends AudioWorkletProcessor {
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const inputChannel = input[0];
            const outputChannel = outputs[0][0];

            for (let i = 0; i < inputChannel.length; i++) {
                outputChannel[i] = inputChannel[i];
            }

            if (globalThis.isRecording && globalThis.ws && globalThis.ws.readyState === WebSocket.OPEN) {
                const dataArray = new Int16Array(inputChannel.length);
                for (let i = 0; i < inputChannel.length; i++) {
                    dataArray[i] = Math.max(-1, Math.min(1, inputChannel[i])) * 0x7FFF;
                }
                globalThis.ws.send(dataArray.buffer);
                // 打印傳送的音訊數據大小
                console.log(`Sent audio data size: ${dataArray.buffer.byteLength} bytes`);
            }
        }
        return true;
    }
}

registerProcessor('my-audio-processor', MyAudioProcessor);