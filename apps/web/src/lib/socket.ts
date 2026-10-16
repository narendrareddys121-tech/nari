import { io, Socket } from 'socket.io-client';
import type {
  BidPlacedEvent,
  OutbidEvent,
  AuctionEndedEvent,
  AuctionUpdatedEvent,
} from '@bidrush/shared';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== 'undefined'
    ? window.location.origin.replace(/^http/, 'ws')
    : 'http://localhost:4000');

// Create socket instance with auto-connect and reconnection logic
export const socket: Socket = io(WS_URL, {
  autoConnect: typeof window !== 'undefined',
  withCredentials: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

if (typeof window !== 'undefined') {
  socket.on('connect', () => {
    // Connected to WebSocket server
  });

  socket.on('connect_error', (error) => {
    console.warn('[Socket] Connection warning:', error.message);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.info(`[Socket] Reconnected after ${attemptNumber} attempts`);
  });
}

/**
 * Join an auction room to receive real-time bids and status updates
 */
export function joinAuctionRoom(auctionId: string): void {
  if (!auctionId) return;
  if (!socket.connected) {
    socket.connect();
  }
  socket.emit('auction:join', auctionId);
}

/**
 * Leave an auction room
 */
export function leaveAuctionRoom(auctionId: string): void {
  if (!auctionId) return;
  socket.emit('auction:leave', auctionId);
}

/**
 * Listen for new bids placed on watched auctions
 */
export function onBidPlaced(callback: (data: BidPlacedEvent) => void): () => void {
  socket.on('auction:bid_placed', callback);
  return () => {
    socket.off('auction:bid_placed', callback);
  };
}

/**
 * Listen for when the user is outbid
 */
export function onOutbid(callback: (data: OutbidEvent) => void): () => void {
  socket.on('auction:outbid', callback);
  return () => {
    socket.off('auction:outbid', callback);
  };
}

/**
 * Listen for auction end events
 */
export function onAuctionEnded(callback: (data: AuctionEndedEvent) => void): () => void {
  socket.on('auction:ended', callback);
  return () => {
    socket.off('auction:ended', callback);
  };
}

/**
 * Listen for auction updates (price, bid count, status)
 */
export function onAuctionUpdated(callback: (data: AuctionUpdatedEvent) => void): () => void {
  socket.on('auction:updated', callback);
  socket.on('auction:state', (state: { auctionId: string; currentPricePaise: number; status: any; endsAt: string }) => {
    callback({
      auctionId: state.auctionId,
      currentPricePaise: state.currentPricePaise,
      bidCount: 0,
      status: state.status,
    });
  });

  return () => {
    socket.off('auction:updated', callback);
    socket.off('auction:state');
  };
}
