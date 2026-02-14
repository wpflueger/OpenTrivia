export interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
}

export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "failed";

export interface SignalingMessage {
  type: "offer" | "answer" | "candidate";
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

interface PlayerInfo {
  playerId: string;
  nickname?: string;
}

export class HostWebRTCManager {
  private connections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private signalingUrl: string;
  private roomId: string;
  private hostToken: string;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private processedPlayers: Set<string> = new Set();
  private onPlayerJoin?: (playerId: string, nickname?: string) => void;
  private onPlayerLeave?: (playerId: string) => void;
  private onMessage?: (playerId: string, data: unknown) => void;
  private processedCandidates: Map<string, number> = new Map();

  constructor(options: {
    signalingUrl: string;
    roomId: string;
    hostToken: string;
    onPlayerJoin?: (playerId: string, nickname?: string) => void;
    onPlayerLeave?: (playerId: string) => void;
    onMessage?: (playerId: string, data: unknown) => void;
  }) {
    this.signalingUrl = options.signalingUrl;
    this.roomId = options.roomId;
    this.hostToken = options.hostToken;
    this.onPlayerJoin = options.onPlayerJoin;
    this.onPlayerLeave = options.onPlayerLeave;
    this.onMessage = options.onMessage;
  }

  async start(): Promise<void> {
    this.pollInterval = setInterval(() => this.poll(), 1000);
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.disconnect();
  }

  private async poll(): Promise<void> {
    try {
      await this.checkForNewPlayers();
      await this.checkForCandidates();
    } catch (error) {
      console.error("Poll error:", error);
    }
  }

  private async checkForNewPlayers(): Promise<void> {
    try {
      const response = await fetch(
        `${this.signalingUrl}/api/session/${this.roomId}/offer?hostToken=${this.hostToken}`,
      );
      const data = await response.json();

      if (data.players) {
        for (const player of data.players) {
          if (player.hasOffer && !this.processedPlayers.has(player.playerId)) {
            await this.handleNewPlayer(player.playerId);
          }
        }
      }
    } catch (error) {
      console.error("Error checking for players:", error);
    }
  }

  private async handleNewPlayer(playerId: string): Promise<void> {
    this.processedPlayers.add(playerId);

    const connection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendCandidate(playerId, event.candidate);
      }
    };

    connection.ondatachannel = (event) => {
      this.setupDataChannel(playerId, event.channel);
    };

    connection.onconnectionstatechange = () => {
      if (
        connection.connectionState === "disconnected" ||
        connection.connectionState === "failed"
      ) {
        this.handlePlayerLeave(playerId);
      }
    };

    this.connections.set(playerId, connection);

    try {
      const response = await fetch(
        `${this.signalingUrl}/api/session/${this.roomId}/offer?hostToken=${this.hostToken}&playerId=${playerId}`,
      );
      const data = await response.json();

      if (data.offer) {
        const offer = new RTCSessionDescription(data.offer);
        await connection.setRemoteDescription(offer);

        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);

        await this.sendAnswer(playerId, answer);
      }
    } catch (error) {
      console.error("Error handling new player:", error);
      return;
    }

    this.onPlayerJoin?.(playerId);
  }

  private async sendAnswer(
    playerId: string,
    answer: RTCSessionDescriptionInit,
  ): Promise<void> {
    await fetch(`${this.signalingUrl}/api/session/${this.roomId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: this.roomId,
        playerId,
        answer,
        hostToken: this.hostToken,
      }),
    });
  }

  private async sendCandidate(
    playerId: string,
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    await fetch(`${this.signalingUrl}/api/session/${this.roomId}/candidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: this.roomId,
        playerId,
        candidate,
        hostToken: this.hostToken,
      }),
    });
  }

  private async checkForCandidates(): Promise<void> {
    try {
      const response = await fetch(
        `${this.signalingUrl}/api/session/${this.roomId}/candidate?hostToken=${this.hostToken}`,
      );
      const data = await response.json();

      if (data.candidatesByPlayer) {
        for (const [playerId, candidates] of Object.entries(
          data.candidatesByPlayer,
        )) {
          const connection = this.connections.get(playerId);
          if (!connection || !connection.remoteDescription) continue;

          const lastProcessed = this.processedCandidates.get(playerId) || 0;
          const newCandidates = (candidates as RTCIceCandidateInit[]).slice(
            lastProcessed,
          );

          for (const candidate of newCandidates) {
            try {
              await connection.addIceCandidate(new RTCIceCandidate(candidate));
              this.processedCandidates.set(playerId, lastProcessed + 1);
            } catch (error) {
              console.error("Error adding ICE candidate:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error checking for candidates:", error);
    }
  }

  private setupDataChannel(playerId: string, channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log(`Data channel open for ${playerId}`);
      this.dataChannels.set(playerId, channel);
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessage?.(playerId, data);
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    channel.onclose = () => {
      console.log(`Data channel closed for ${playerId}`);
      this.handlePlayerLeave(playerId);
    };
  }

  private handlePlayerLeave(playerId: string): void {
    this.connections.get(playerId)?.close();
    this.connections.delete(playerId);
    this.dataChannels.delete(playerId);
    this.onPlayerLeave?.(playerId);
  }

  send(playerId: string, data: unknown): void {
    const channel = this.dataChannels.get(playerId);
    if (channel && channel.readyState === "open") {
      channel.send(JSON.stringify(data));
    }
  }

  broadcast(data: unknown): void {
    const message = JSON.stringify(data);
    this.dataChannels.forEach((channel) => {
      if (channel.readyState === "open") {
        channel.send(message);
      }
    });
  }

  getConnectedPlayers(): string[] {
    return Array.from(this.dataChannels.entries())
      .filter(([, channel]) => channel.readyState === "open")
      .map(([playerId]) => playerId);
  }

  disconnect(): void {
    this.connections.forEach((conn) => conn.close());
    this.connections.clear();
    this.dataChannels.clear();
    this.processedPlayers.clear();
  }
}

export class PlayerWebRTCManager {
  private connection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private signalingUrl: string;
  private roomId: string;
  private playerId: string;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private processedCandidates: number = 0;
  private onMessage?: (data: unknown) => void;
  private onConnected?: () => void;
  private onDisconnected?: () => void;

  constructor(options: {
    signalingUrl: string;
    roomId: string;
    playerId: string;
    onMessage?: (data: unknown) => void;
    onConnected?: () => void;
    onDisconnected?: () => void;
  }) {
    this.signalingUrl = options.signalingUrl;
    this.roomId = options.roomId;
    this.playerId = options.playerId;
    this.onMessage = options.onMessage;
    this.onConnected = options.onConnected;
    this.onDisconnected = options.onDisconnected;
  }

  async connect(): Promise<void> {
    this.connection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    this.connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendCandidate(event.candidate);
      }
    };

    this.connection.onconnectionstatechange = () => {
      if (
        this.connection?.connectionState === "disconnected" ||
        this.connection?.connectionState === "failed"
      ) {
        this.onDisconnected?.();
      }
    };

    this.dataChannel = this.connection.createDataChannel("game");
    this.setupDataChannel(this.dataChannel);

    const offer = await this.connection.createOffer();
    await this.connection.setLocalDescription(offer);

    await this.sendOffer(offer);

    this.pollInterval = setInterval(() => this.poll(), 500);
  }

  private async poll(): Promise<void> {
    try {
      await this.checkForAnswer();
      await this.checkForCandidates();
    } catch (error) {
      console.error("Poll error:", error);
    }
  }

  private async sendOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    await fetch(`${this.signalingUrl}/api/session/${this.roomId}/offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: this.roomId,
        playerId: this.playerId,
        offer,
      }),
    });
  }

  private async sendCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await fetch(`${this.signalingUrl}/api/session/${this.roomId}/candidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: this.roomId,
        playerId: this.playerId,
        candidate,
      }),
    });
  }

  private async checkForAnswer(): Promise<void> {
    try {
      const response = await fetch(
        `${this.signalingUrl}/api/session/${this.roomId}/answer?playerId=${this.playerId}`,
      );
      const data = await response.json();

      if (
        data.answer &&
        this.connection?.signalingState === "have-local-offer"
      ) {
        const answer = new RTCSessionDescription(data.answer);
        await this.connection.setRemoteDescription(answer);
      }
    } catch (error) {
      console.error("Error checking for answer:", error);
    }
  }

  private async checkForCandidates(): Promise<void> {
    if (!this.connection?.remoteDescription) {
      return;
    }

    try {
      const response = await fetch(
        `${this.signalingUrl}/api/session/${this.roomId}/candidate?playerId=${this.playerId}&afterIndex=${this.processedCandidates}`,
      );
      const data = await response.json();

      if (data.candidates) {
        for (const candidate of data.candidates) {
          try {
            await this.connection?.addIceCandidate(
              new RTCIceCandidate(candidate),
            );
            this.processedCandidates++;
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error checking for candidates:", error);
    }
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onopen = () => {
      console.log("Player data channel open");
      this.onConnected?.();
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessage?.(data);
      } catch (error) {
        console.error("Failed to parse message:", error);
      }
    };

    channel.onclose = () => {
      console.log("Player data channel closed");
      this.onDisconnected?.();
    };
  }

  send(data: unknown): void {
    if (this.dataChannel && this.dataChannel.readyState === "open") {
      this.dataChannel.send(JSON.stringify(data));
    }
  }

  disconnect(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.dataChannel?.close();
    this.connection?.close();
    this.dataChannel = null;
    this.connection = null;
  }
}
