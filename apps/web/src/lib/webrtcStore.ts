import { HostWebRTCManager } from "@/lib/webrtc";

let hostWebRTC: HostWebRTCManager | null = null;

export function getHostWebRTC(): HostWebRTCManager | null {
  return hostWebRTC;
}

export function setHostWebRTC(webrtc: HostWebRTCManager | null): void {
  hostWebRTC = webrtc;
}
