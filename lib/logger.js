const console = require('console');

class Logger {
    isDebugEnabled

    constructor(isDebugEnabled = false) {
        this.isDebugEnabled = isDebugEnabled;
    }

    debug(msg) {
        if (this.isDebugEnabled) {
            this.log(msg);
        }
    }

    log(msg) {
        console.log(msg);
    }
}

module.exports = Logger;
