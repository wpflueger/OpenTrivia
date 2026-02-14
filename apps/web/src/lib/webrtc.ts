export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'candidate';
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export class WebRTCManager {
  private localConnection: RTCPeerConnection | null = null;
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private signalingUrl: string;
  private roomId: string;
  private hostToken?: string;
  private onMessage?: (playerId: string, data: unknown) => void;
  private onPlayerJoin?: (playerId: string) => void;
  private onPlayerLeave?: (playerId: string) => void;

  constructor(options: {
    signalingUrl: string;
    roomId: string;
    hostToken?: string;
    onMessage?: (playerId: string, data: unknown) => void;
    onPlayerJoin?: (playerId: string) => void;
    onPlayerLeave?: (playerId: string) => void;
  }) {
    this.signalingUrl = options.signalingUrl;
    this.roomId = options.roomId;
    this.hostToken = options.hostToken;
    this.onMessage = options.onMessage;
    this.onPlayerJoin = options.onPlayerJoin;
    this.onPlayerLeave = options.onPlayerLeave;
  }

  async connect(): Promise<void> {
    this.localConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this.localConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendCandidate(event.candidate);
      }
    };

    this.localConnection.ondatachannel = (event) => {
      this.setupDataChannel(event.channel, 'host');
    };

    await this.fetchOffer();
  }

  private async fetchOffer(): Promise<void> {
    try {
      const response = await fetch(`${this.signalingUrl}/session/${this.roomId}/offer`);
      const data = await response.json();

      if (data.offer) {
        const offer = new RTCSessionDescription(data.offer);
        await this.localConnection?.setRemoteDescription(offer);

        const answer = await this.localConnection?.createAnswer();
        if (answer) {
          await this.localConnection?.setLocalDescription(answer);
          await this.sendAnswer(answer);
        }
      }
    } catch (error) {
      console.error('Failed to fetch offer:', error);
    }
  }

  private async sendAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await fetch(`${this.signalingUrl}/session/${this.roomId}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: this.roomId, answer }),
    });
  }

  private async sendCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await fetch(`${this.signalingUrl}/session/${this.roomId}/candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: this.roomId, candidate }),
    });
  }

  private setupDataChannel(channel: RTCDataChannel, playerId: string): void {
    channel.onopen = () => {
      console.log(`Data channel open for ${playerId}`);
      this.onPlayerJoin?.(playerId);
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessage?.(playerId, data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    channel.onclose = () => {
      console.log(`Data channel closed for ${playerId}`);
      this.onPlayerLeave?.(playerId);
      this.dataChannels.delete(playerId);
    };

    this.dataChannels.set(playerId, channel);
  }

  send(playerId: string, data: unknown): void {
    const channel = this.dataChannels.get(playerId);
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify(data));
    }
  }

  broadcast(data: unknown): void {
    const message = JSON.stringify(data);
    this.dataChannels.forEach((channel) => {
      if (channel.readyState === 'open') {
        channel.send(message);
      }
    });
  }

  disconnect(): void {
    this.dataChannels.forEach((channel) => channel.close());
    this.dataChannels.clear();
    this.localConnection?.close();
    this.localConnection = null;
  }
}

export class PlayerWebRTCManager {
  private connection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private signalingUrl: string;
  private roomId: string;
  private onMessage?: (data: unknown) => void;

  constructor(options: {
    signalingUrl: string;
    roomId: string;
    onMessage?: (data: unknown) => void;
  }) {
    this.signalingUrl = options.signalingUrl;
    this.roomId = options.roomId;
    this.onMessage = options.onMessage;
  }

  async connect(): Promise<void> {
    this.connection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    this.connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendCandidate(event.candidate);
      }
    };

    this.dataChannel = this.connection.createDataChannel('game');
    this.setupDataChannel(this.dataChannel);

    const offer = await this.connection.createOffer();
    await this.connection.setLocalDescription(offer);

    await this.sendOffer(offer);

    await this.waitForAnswer();
  }

  private async sendOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    await fetch(`${this.signalingUrl}/session/${this.roomId}/offer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: this.roomId, offer }),
    });
  }

  private async sendCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await fetch(`${this.signalingUrl}/session/${this.roomId}/candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: this.roomId, candidate }),
    });
  }

  private async waitForAnswer(): Promise<void> {
    const maxAttempts = 50;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(
          `${this.signalingUrl}/session/${this.roomId}/answer`
        );
        const data = await response.json();

        if (data.answer) {
          const answer = new RTCSessionDescription(data.answer);
          await this.connection?.setRemoteDescription(answer);
          return;
        }
      } catch (error) {
        console.error('Failed to get answer:', error);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
      attempts++;
    }

    throw new Error('Failed to connect: timeout waiting for answer');
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log('Player data channel open');
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessage?.(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    channel.onclose = () => {
      console.log('Player data channel closed');
    };
  }

  send(data: unknown): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(data));
    }
  }

  disconnect(): void {
    this.dataChannel?.close();
    this.connection?.close();
    this.dataChannel = null;
    this.connection = null;
  }
}
