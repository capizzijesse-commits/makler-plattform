// Pure, fail-closed configuration check. Never import environment values into a client.
export type LocalAutomationTestProof = {
  version: 1;
  scope: 'LOCAL_SYNTHETIC_AUTOMATION';
  database: { name: string; host: '127.0.0.1'; port: number };
  fixturePort: number;
  appPort: number;
  initialTables: 0;
  freshCluster: true;
  syntheticOnly: true;
  expiresAt: string;
};

export function localAutomationTestBinding(env: Record<string, string | undefined>): string {
  return JSON.stringify(['NODE_ENV','INSERAT_AI_LOCAL_AUTOMATION_TEST','INSERAT_AI_LOCAL_TEST_PROOF_PATH','INSERAT_AI_LOCAL_TEST_PROOF_SHA256','DATABASE_URL','DATABASE_URL_UNPOOLED','STORAGE_PROVIDER','R2_ENDPOINT','R2_PUBLIC_BASE_URL','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','OPENAI_BASE_URL','OPENAI_API_KEY'].map(key => [key, env[key] ?? '']));
}

export function validateLocalAutomationTestConfig(
  env: Record<string, string | undefined>, proof: LocalAutomationTestProof, now = Date.now(),
): boolean {
  try {
    if (env.NODE_ENV !== 'development' || env.INSERAT_AI_LOCAL_AUTOMATION_TEST !== 'ISOLATED_SIMULATED_ONLY') return false;
    if (['VERCEL','VERCEL_ENV','VERCEL_URL','VERCEL_PROJECT_ID','CI'].some(key => !!env[key])) return false;
    if (!proof || proof.version !== 1 || proof.scope !== 'LOCAL_SYNTHETIC_AUTOMATION' || proof.initialTables !== 0 || proof.freshCluster !== true || proof.syntheticOnly !== true) return false;
    const expiry = Date.parse(proof.expiresAt);
    if (!Number.isFinite(expiry) || expiry <= now || expiry - now > 8 * 60 * 60 * 1000) return false;
    const ports = [proof.database.port, proof.fixturePort, proof.appPort];
    if (ports.some(port => !Number.isInteger(port) || port < 1024 || port > 65535) || new Set(ports).size !== 3) return false;
    if (proof.database.host !== '127.0.0.1' || !/^inserat[a-z0-9]*_[a-z0-9_]+$/i.test(proof.database.name)) return false;
    // A fresh, explicitly attested local database is required; no remote/pooled alias.
    for (const key of ['DATABASE_URL','DATABASE_URL_UNPOOLED']) {
      const url = new URL(env[key] ?? '');
      if (!['postgres:','postgresql:'].includes(url.protocol) || url.hostname !== '127.0.0.1' || Number(url.port) !== proof.database.port || url.pathname !== '/' + proof.database.name || url.search || url.hash) return false;
    }
    if (env.DATABASE_URL !== env.DATABASE_URL_UNPOOLED) return false;
    const fixture = 'http://127.0.0.1:' + proof.fixturePort;
    if (env.STORAGE_PROVIDER !== 'r2' || env.R2_ENDPOINT !== fixture || env.R2_PUBLIC_BASE_URL !== fixture + '/testbucket' || env.R2_BUCKET !== 'testbucket') return false;
    if (env.R2_ACCESS_KEY_ID !== 'LOCAL_SIMULATION' || env.R2_SECRET_ACCESS_KEY !== 'LOCAL_SIMULATION') return false;
    if (env.OPENAI_BASE_URL !== fixture + '/v1' || env.OPENAI_API_KEY !== 'LOCAL_SIMULATION_NOT_A_KEY') return false;
    const allowed = new Set(['DATABASE_URL','DATABASE_URL_UNPOOLED','R2_ENDPOINT','R2_PUBLIC_BASE_URL','R2_BUCKET','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','OPENAI_BASE_URL','OPENAI_API_KEY']);
    // Refuse alternative credentials, cloud services, proxies and connection aliases.
    for (const [key, value] of Object.entries(env)) {
      if (!value || allowed.has(key)) continue;
      const serviceKey = key.replace(/^NEXT_PUBLIC_/i, '');
      if (/^(?:STRIPE|RESEND|SMTP|MAILGUN|SENDGRID|POSTMARK|SES_|AWS_|S3_|BLOB_|R2_|OPENAI_|ANTHROPIC|AZURE_|PORTAL|IMMO|NEON_|PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE|POSTGRES|SUPABASE|CLOUDINARY|GOOGLE_|GA_|CLARITY|PRICEHUBBLE|MAPTILER)/i.test(serviceKey)) return false;
      if (/(?:TOKEN|SECRET|PASSWORD|KEY|EMAIL|DATABASE_URL|PROXY|DSN)$/i.test(key)) return false;
      if (/(?:URL|ENDPOINT)$/i.test(key)) return false;
    }
    return true;
  } catch { return false; }
}
