class AlarmClient {
    constructor(options) {
        this.config = options.config;
    }

    startScanning() {
        this.config.scanning = true;
    }

    stopScanning() {
        this.config.scanning = false;
    }
}

module.exports = AlarmClient;