const core = require('@actions/core');
const { createHash } = require('crypto');
const { DefaultAzureCredential } = require('@azure/identity');
const {
  CryptographyClient,
  KeyClient,
  KnownSignatureAlgorithms
} = require('@azure/keyvault-keys');

try {
  const credential = new DefaultAzureCredential();

  const githubAppClientId = core.getInput('gh-app-client-id');
  const keyVaultName = core.getInput('key-vault-name');
  const keyName = core.getInput('key-name');
  const ghOrg = core.getInput('gh-org');
  let ghInstallationId = core.getInput('gh-installation-id');
  const tokenDuration = parseInt(core.getInput('token-duration'), 10);

  if (!ghInstallationId && !ghOrg) {
    throw new Error('Either gh-installation-id or gh-org must be provided');
  }

  const now = Math.floor(Date.now() / 1000);
  const nowWithSafetyMargin = now - 30;
  const expiration = now + tokenDuration;

  const jwtHeader = base64encodeJSON({
    alg: 'RS256',
    typ: 'JWT'
  });

  const jwtPayload = base64encodeJSON({
    iss: githubAppClientId,
    iat: nowWithSafetyMargin,
    exp: expiration
  });

  const jwtData = `${jwtHeader}.${jwtPayload}`;
  const jwtDataDigest = createHash('sha256').update(jwtData).digest();

  const serviceClient = new KeyClient(
    `https://${keyVaultName}.vault.azure.net`,
    credential
  );

  serviceClient.getKey(keyName).then(async (keyVaultKey) => {
    if (keyVaultKey?.name) {
      const cryptoClient = new CryptographyClient(keyVaultKey, credential);
      const { result: signature } = await cryptoClient.sign(KnownSignatureAlgorithms.RS256, jwtDataDigest);
      const jwtSignature = urlBase64encode(signature);
  
      const appToken = `${jwtData}.${jwtSignature}`;

      const { Octokit } = await import("@octokit/core");
      const octokit = new Octokit({
        auth: appToken
      });

      let ghToken;

      if (ghOrg) {
        let orgInstallation = await octokit.request(`GET /orgs/${ghOrg}/installation`, {
          org: ghOrg,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        })
        ghInstallationId = orgInstallation.data.id;
      }

      if (!ghInstallationId) {
        throw new Error('Failed to get installation ID. Make sure you have provided correct gh-org or provide gh-installation-id.');
      }

      let installationToken = await octokit.request(`POST /app/installations/${ghInstallationId}/access_tokens`, {
        installation_id: ghInstallationId,
        headers: {
          'X-GitHub-Api-Version': '2022-11-28'
        }
      })
      ghToken = installationToken.data.token

      core.setSecret(ghToken);
      core.setOutput('gh_token', ghToken);
    }
  });
} catch (error) {
  core.setFailed(error.message);
}

/**
 * @param {string} base64
 * @returns {string}
 */
function urlBase64(base64) {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * @param {Record<string,unknown>} obj
 * @returns {string}
 */
function base64encodeJSON(obj) {
  return urlBase64(btoa(JSON.stringify(obj)));
}

/**
 * @param {string} buffer
 * @returns {string}
 */
function urlBase64encode(buffer) {
  // Convert the binary data (buffer) to a base64 string
  const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
  return urlBase64(base64);
}