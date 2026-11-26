import { createHash, createPublicKey, verify } from 'node:crypto';
import { productionManifest, verifyStaging } from './staging-integrity.mjs';

export async function productionDigest(root) {
  return createHash('sha256').update(JSON.stringify(await productionManifest(root))).digest('hex');
}

export async function authorizeStaging({ baseline, candidate, record, signature, trustedKey, expectedDeployment, expectedCommit }) {
  // Trust inputs must come from the independent publisher, never the PR.
  if (!record || record.repository !== 'durart/moja-silownia' ||
      record.environment !== 'production' || record.schema !== 1 ||
      typeof expectedDeployment !== 'string' || !/^[1-9][0-9]*$/.test(expectedDeployment) ||
      record.deployment !== expectedDeployment ||
      typeof expectedCommit !== 'string' || !/^[a-f0-9]{40}$/.test(expectedCommit) ||
      record.commit !== expectedCommit || !/^[a-f0-9]{64}$/.test(record.digest ?? '')) {
    throw new Error('Invalid production provenance');
  }
  const key = createPublicKey(trustedKey);
  if (key.asymmetricKeyType !== 'ed25519' || !Buffer.isBuffer(signature) || signature.length !== 64 ||
      !verify(null, Buffer.from(JSON.stringify(record)), key, signature)) {
    throw new Error('Invalid production signature');
  }
  if (await productionDigest(baseline) !== record.digest) throw new Error('Baseline digest mismatch');
  await verifyStaging(baseline, candidate);
  if (await productionDigest(candidate) !== record.digest) throw new Error('Candidate digest mismatch');
  return true;
}
