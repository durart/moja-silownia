// Pure simulation only. Trust inputs must be supplied by an independent owner-controlled system.
import { siteManifest } from './staging-integrity.mjs';
import { manifestDigest } from './release-evidence.mjs';

const validSha = value => /^[a-f0-9]{40}$/.test(value ?? '');
const validDigest = value => /^[a-f0-9]{64}$/.test(value ?? '');
const validRun = value => typeof value === 'string' && /^[1-9][0-9]*$/.test(value);

export async function simulateAuthorization({mode, branch, requestedSha, currentMainSha, runSha, runId,
  artifact, expectedDigest, regression, approval, owner, trustedPrior}) {
  if (!['publish','rollback'].includes(mode) || branch !== 'main' ||
      ![requestedSha,currentMainSha,runSha].every(validSha) || currentMainSha !== runSha ||
      !validRun(runId) || !validDigest(expectedDigest)) throw new Error('Invalid or stale release');
  if (mode === 'publish' && (requestedSha !== runSha ||
      !['unit','browser','security'].every(key => regression?.[key] === 'success'))) {
    throw new Error('Release regression or SHA rejected');
  }
  if (mode === 'rollback' && (!trustedPrior || trustedPrior.commit !== requestedSha ||
      trustedPrior.digest !== expectedDigest || !validRun(trustedPrior.deployment))) {
    throw new Error('Missing or mismatched trusted rollback record');
  }
  if (typeof owner !== 'string' || !owner || approval?.reviewer !== owner ||
      approval?.status !== 'approved' || approval?.runId !== runId ||
      approval?.sha !== requestedSha || approval?.digest !== expectedDigest || approval?.mode !== mode) {
    throw new Error('Owner approval rejected');
  }
  const manifest = await siteManifest(artifact);
  if (!manifest.some(([path]) => path === 'preview/index.html') ||
      manifestDigest(manifest) !== expectedDigest) throw new Error('Artifact digest mismatch');
  return { simulated: true, mode, sha: requestedSha, digest: expectedDigest, deploymentAuthorized: false };
}
