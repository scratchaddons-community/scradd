const x: number = 5;
const timeWindow: number = 20;

interface Message {
    message: string;
    timestamp: number;
}
const userMessages: Record<string, Message[]> = {};
function logMessage(userId: string, message: string): void {
    const timestamp: number = Math.floor(Date.now() / 1000)
    if (!userMessages[userId]) {
        userMessages[userId] = [];
    }

    userMessages[userId]?.push({ message, timestamp });


    userMessages[userId] = userMessages[userId]?.filter(m => timestamp - m.timestamp <= timeWindow) || []
}

export function isSpam(userId: string, message: string): boolean {
    const timestamp: number = Math.floor(Date.now() / 1000)

    if (((userMessages[userId]?.length || 0)) < x) {
        return false;
    }


    const recentMessages = userMessages[userId]?.slice(-x);
    return recentMessages?.every(m => m.message === message && timestamp - m.timestamp <= timeWindow) || false
}

export function handleMessage(userId: string, message: string): boolean {

    if (isSpam(userId, message)) {
        return true
    } else {
        logMessage(userId, message);
        return false
    }
}

