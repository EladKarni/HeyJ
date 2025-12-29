export default class Message {
  messageId: string;
  timestamp: Date;
  uid: string;
  audioUrl: string;
  isRead: boolean;
  conversationId?: string;

  constructor(
    messageId: string,
    timestamp: Date,
    uid: string,
    audioUrl: string,
    isRead: boolean = false,
    conversationId?: string
  ) {
    this.messageId = messageId;
    this.timestamp = timestamp;
    this.uid = uid;
    this.audioUrl = audioUrl;
    this.isRead = isRead;
    this.conversationId = conversationId;
  }

  toJSON() {
    return {
      messageId: this.messageId,
      timestamp: this.timestamp.toISOString(),
      uid: this.uid,
      audioUrl: this.audioUrl,
      isRead: this.isRead,
      ...(this.conversationId && { conversationid: this.conversationId }),
    };
  }

  static fromJSON(data: any) {
    return new Message(
      data.messageId,
      new Date(data.timestamp),
      data.uid,
      data.audioUrl,
      data.isRead ?? false,
      data.conversationid || data.conversationId
    );
  }
}
