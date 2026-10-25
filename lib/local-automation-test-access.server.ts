import 'server-only';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateLocalAutomationTestConfig, localAutomationTestBinding, type LocalAutomationTestProof } from './local-automation-test-config';

export async function isIsolatedLocalAutomationTest(): Promise<boolean> {
  // Do not read proof files or initialize Prisma for ordinary development/production.
  if (process.env.NODE_ENV !== 'development' || process.env.INSERAT_AI_LOCAL_AUTOMATION_TEST !== 'ISOLATED_SIMULATED_ONLY') return false;
  try {
    const file = process.env.INSERAT_AI_LOCAL_TEST_PROOF_PATH;
    const expected = process.env.INSERAT_AI_LOCAL_TEST_PROOF_SHA256;
    if (!file || !expected || !/^[a-f0-9]{64}$/.test(expected)) return false;
    const bytes = readFileSync(file);
    const actual = createHash('sha256').update(bytes).digest('hex');
    if (actual !== expected) return false;
    const proof = JSON.parse(bytes.toString('utf8')) as LocalAutomationTestProof;
    if (!validateLocalAutomationTestConfig(process.env, proof)) return false;
    const attestation = (globalThis as unknown as Record<symbol, unknown>)[Symbol.for('inserat-ai.local-test-network.v1')] as { proofSha256?: string; networkPolicy?: string; configurationHash?: string } | undefined;
    const configurationHash = createHash('sha256').update(localAutomationTestBinding(process.env)).digest('hex');
    if (!attestation || attestation.proofSha256 !== actual || attestation.networkPolicy !== 'loopback-only' || attestation.configurationHash !== configurationHash) return false;
    // Configuration is safe before any connection. Confirm the live server identity
    // and the absence of real users/integration credentials on every render.
    const { prisma } = await import('./prisma');
    const [identity, portals, credentials, realUsers] = await prisma.$transaction([
      prisma.$queryRaw<Array<{ database: string; host: string; port: number }>>`SELECT current_database() AS database, host(inet_server_addr()) AS host, inet_server_port() AS port`,
      prisma.portalConnection.count(),
      prisma.portalCredential.count(),
      prisma.user.count({ where: { NOT: { email: { endsWith: '@example.test' } } } }),
    ]);
    return identity.length === 1 && identity[0].database === proof.database.name && identity[0].host === proof.database.host && identity[0].port === proof.database.port && portals === 0 && credentials === 0 && realUsers === 0;
  } catch {
    // No environment values, URLs, credentials or database errors are logged.
    return false;
  }
}
