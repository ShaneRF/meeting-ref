class MyAudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.isRecording = false;
        this.port.onmessage = (event) => {
            if (event.data.command === 'startRecording') {
                this.isRecording = true;
                console.log('Processor: Recording started');
            } else if (event.data.command === 'stopRecording') {
                this.isRecording = false;
                console.log('Processor: Recording stopped');
            }
        };
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
            const inputChannel = input[0];
            const dataArray = new Int16Array(inputChannel.length);
            for (let i = 0; i < inputChannel.length; i++) {
                dataArray[i] = Math.max(-1, Math.min(1, inputChannel[i])) * 0x7FFF;
            }
            this.port.postMessage({
                type: 'audioData',
                buffer: dataArray.buffer,
                size: dataArray.byteLength
            }, [dataArray.buffer]);
        }
        return true;
    }
}

registerProcessor('my-audio-processor', MyAudioProcessor);