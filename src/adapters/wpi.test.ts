import { describe, expect, it } from 'vitest';
import { nearestPort, parseWpi } from './wpi';

const row = (o: Record<string, unknown>) => ({ portName: 'PUERTO LIMON', latitude: 9.99, longitude: -83.03, harborSize: 'Medium', 'Channel Depth (m)': 11, shelterAfforded: 'Fair', pilotageCompulsory: '-', ...o });

describe('wpi', () => {
  it('reads a port under a key, matches fields loosely and drops empty ones', () => {
    const d = parseWpi({ ports: [row({})] }, 0);
    expect(d.ports[0].name).toBe('PUERTO LIMON');
    expect(d.ports[0].facts).toEqual({ harbourSize: 'Medium', channelDepthM: '11', shelter: 'Fair' });
  });
  it('drops ports outside the region box and without a position', () => {
    const d = parseWpi([row({}), row({ portName: 'MIAMI', latitude: 25.7, longitude: -80.2 }), row({ portName: 'NOWHERE', latitude: null })], 0);
    expect(d.ports.map((p) => p.name)).toEqual(['PUERTO LIMON']);
  });
  it('rejects a body without a list', () => {
    expect(() => parseWpi({ a: 1 }, 0)).toThrow();
  });
  it('finds the nearest port within range', () => {
    const { ports } = parseWpi([row({})], 0);
    expect(nearestPort(ports, [-83.0252, 9.9909])?.name).toBe('PUERTO LIMON');
    expect(nearestPort(ports, [-82.5, 9.4])).toBeNull();
  });
});
