import { WebSocket } from 'ws';

export interface ProtocolEvent {
  type: 'agent_registered' | 'job_created' | 'job_status_updated' | 'job_verified';
  timestamp: string;
  data: Record<string, any>;
}

class EventHub {
  private sockets: Set<WebSocket> = new Set();

  addSocket(ws: WebSocket) {
    this.sockets.add(ws);
    ws.on('close', () => this.sockets.delete(ws));
  }

  broadcast(type: ProtocolEvent['type'], data: Record<string, any>) {
    const event: ProtocolEvent = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };
    const payload = JSON.stringify(event);

    for (const ws of this.sockets) {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(payload);
        } catch {
          this.sockets.delete(ws);
        }
      }
    }
  }
}

export const eventHub = new EventHub();
