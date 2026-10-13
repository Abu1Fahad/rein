import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  process.loadEnvFile(path.join(ROOT, '.env'));
} catch {
  // No .env file — rely on the real environment.
}

const env = process.env;

export const config = {
  port: Number(env.PORT) || 3000,
  // 127.0.0.1 on a server behind Caddy/nginx (only the proxy can reach the app); empty = all interfaces.
  host: env.HOST || '',
  publicUrl: (env.PUBLIC_URL || '').replace(/\/+$/, ''),
  dataDir: path.resolve(ROOT, env.DATA_DIR || 'data'),
  adminPassword: env.ADMIN_PASSWORD || '',
  sessionSecret: env.SESSION_SECRET || '',
  // Behind a reverse proxy: true (= 1 hop, e.g. Caddy) or the number of proxies (2 = Cloudflare + Caddy).
  trustProxy: env.TRUST_PROXY === 'true' ? 1 : /^\d+$/.test(env.TRUST_PROXY || '') ? Number(env.TRUST_PROXY) : 0,
  discord: {
    token: env.DISCORD_TOKEN || '',
    clientId: env.DISCORD_CLIENT_ID || '',
    // Privileged "Server Members" intent: enables instant username/avatar updates.
    // Turn it on in the Developer Portal before setting this to true.
    membersIntent: env.DISCORD_MEMBERS_INTENT === 'true',
    // Initial values for settings that admins can later change from the panel.
    guildId: env.DISCORD_GUILD_ID || '',
    registrationChannelId: env.DISCORD_REGISTRATION_CHANNEL_ID || '',
    reviewChannelId: env.DISCORD_REVIEW_CHANNEL_ID || '',
    resultsChannelId: env.DISCORD_RESULTS_CHANNEL_ID || '',
    playerRoleId: env.DISCORD_PLAYER_ROLE_ID || '',
    adminRoleId: env.DISCORD_ADMIN_ROLE_ID || '',
  },
};
