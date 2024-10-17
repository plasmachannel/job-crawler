import logger from "./logger.js";

class Timer {
    constructor() {
        this.totalTime = 0; // Total time for all processes
        this.processCount = 0; // Number of processes completed
        this.startTime = null;
    }

    // Start a timer for a process
    startTimer() {
        this.startTime = new Date().getTime(); // Return the current time in milliseconds
    }

    // Stop the timer and record the processing time
    stopTimer() {
        const endTime = new Date().getTime();
        const processTime = endTime - this.startTime; // Calculate the time taken for this process
        this.processCount += 1;
        this.totalTime += processTime;
        this.startTime = null;

        logger.debug(`Process took ${processTime} ms`);
    }

    getAverageTime() {
        if (this.processCount === 0) {
            return 0;
        }
        return this.totalTime / this.processCount;
    }
}

export default Timer;