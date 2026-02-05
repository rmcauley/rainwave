export interface Relay {
  name: string;
  protocol: 'https://';
  hostname: string;
  port: 443;
}

export type Relays = Relay[];
