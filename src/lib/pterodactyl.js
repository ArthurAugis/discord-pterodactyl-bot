const axios = require('axios');

const PTERO_HOST = process.env.PTERODACTYL_HOST;
const PTERO_APP_KEY = process.env.PTERODACTYL_API_KEY;

const PTERO_DEBUG = process.env.PTERO_DEBUG === 'true';

let appApi;
let clientApi;

const configured = Boolean(PTERO_HOST && PTERO_APP_KEY);

if (!configured) {
  console.warn('Pterodactyl host or key not provided; pterodactyl client will not work until configured.');
  const mock = {
    get: async () => { throw new Error('Pterodactyl client is not configured.'); },
    post: async () => { throw new Error('Pterodactyl client is not configured.'); }
  };
  appApi = mock;
  clientApi = mock;
} else {
  const baseURL = PTERO_HOST.replace(/\/$/, '') + '/api';

  // API instance for Application endpoints (admin)
  appApi = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${PTERO_APP_KEY}`
    }
  });

  // API instance for Client endpoints (user)
  clientApi = axios.create({
    baseURL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${PTERO_APP_KEY}`
    }
  });

  if (PTERO_DEBUG) {
    console.log('[ptero] configured with baseURL', baseURL);
    if (!process.env.PTERODACTYL_API_KEY) {
      console.warn('[ptero] WARNING: PTERODACTYL_API_KEY is not set. Client endpoints (server status) may fail if using an Application Key.');
    }
  }
}

module.exports = {
  /**
   * Normalizes server data from different API endpoints into a consistent format.
   * @param {Object} raw Raw server data
   * @returns {Object} Normalized server object
   */
  normalizeServer(raw) {
    const attrs = raw?.attributes || raw?.data?.attributes || raw;
    const uuid = attrs?.uuid || attrs?.identifier || attrs?.id || attrs?.external_id || attrs?.server?.identifier;
    const name = attrs?.name || attrs?.server?.name || attrs?.server?.attributes?.name || attrs?.name_full;

    let status = attrs?.status || attrs?.current_state?.state || attrs?.current_state || attrs?.server?.attributes?.status || attrs?.server?.status || attrs?.state || attrs?.attributes?.state || attrs?.attributes?.current_state;

    if (attrs?.is_suspended || attrs?.suspended) status = 'suspended';
    if (attrs?.is_installing) status = 'installing';

    if (typeof status === 'number') {
      status = status === 1 ? 'online' : 'offline';
    }

    if (!status) status = 'unknown';
    if (typeof status === 'object') {
      status = status.state || status.current_state || status.status || JSON.stringify(status);
    }

    if (typeof status === 'string') {
      const s = status.toLowerCase();
      const mappings = {
        running: 'online',
        running_rcon: 'online',
        online: 'online',
        start: 'starting',
        starting: 'starting',
        stopping: 'stopping',
        stop: 'stopping',
        offline: 'offline',
        off: 'offline',
        suspended: 'suspended',
        installing: 'installing',
        built: 'built'
      };
      status = mappings[s] || s;
    }

    const node = attrs?.relationships?.node?.attributes?.name || attrs?.node || attrs?.server?.node || attrs?.node_id;
    const owner = attrs?.relationships?.user?.attributes?.username || attrs?.owner || attrs?.relationships?.user || attrs?.server?.relationships?.user || attrs?.user;
    const description = attrs?.description || attrs?.meta || attrs?.server?.attributes?.description;
    const identifier = attrs?.identifier || attrs?.server?.identifier;

    return { uuid, name, status, node, owner, description, identifier };
  },

  /**
   * Lists all servers. Tries application endpoint first, then admin endpoint.
   * @param {Object} params Query parameters
   * @returns {Promise<Array>} List of servers
   */
  async listServers(params = {}) {
    try {
      if (PTERO_DEBUG) console.log('[ptero] listServers: trying application endpoint');
      const res = await appApi.get(`/application/servers`, { params });
      return res.data;
    } catch (e) {
      if (PTERO_DEBUG) console.log('[ptero] listServers: application endpoint failed:', e.response?.status || e.message);

      try {
        if (PTERO_DEBUG) console.log('[ptero] listServers: trying admin endpoint');
        const res2 = await appApi.get(`/admin/servers`, { params });
        return res2.data;
      } catch (err) {
        throw new Error(`Failed to list servers: ${err.response ? JSON.stringify(err.response.data) : err.message}`);
      }
    }
  },

  /**
   * Resolves a server by UUID, Identifier, or Name.
   * @param {string} query Search query
   * @returns {Promise<Array>} List of matching servers
   */
  async resolveServer(query) {
    const res = await this.listServers();
    const data = res && res.data ? res.data : (Array.isArray(res) ? res : (res.servers || []));
    const matches = [];
    for (const item of data) {
      const attrs = item.attributes || item;
      const uuid = attrs?.uuid || attrs?.id || attrs?.identifier || attrs?.external_id;
      const name = attrs?.name || attrs?.server?.name || '';
      if (!query) continue;
      if (uuid && uuid === query) matches.push({ type: 'uuid', id: uuid, raw: item });
      if (attrs?.identifier && attrs.identifier === query) matches.push({ type: 'identifier', id: attrs.identifier, raw: item });
      if (name && name.toLowerCase().includes(query.toLowerCase())) matches.push({ type: 'name', id: uuid || attrs.identifier, raw: item });
    }
    return matches;
  },

  /**
   * Gets detailed info for a server (details + resources).
   * @param {string} uuid Server UUID
   * @returns {Promise<Object>} Server info object
   */
  async getServerInfo(uuid) {
    const details = await this.getServerDetails(uuid);
    let resources = null;
    try {
      resources = await this.getServerResources(uuid);
    } catch (e) {
      console.error('[ptero] getServerInfo: failed to get resources', e.message);
    }
    return { details, resources };
  },

  /**
   * Gets server details from application or client API.
   * @param {string} uuid Server UUID
   * @returns {Promise<Object>} Server details
   */
  async getServerDetails(uuid) {
    const tried = [];
    const id = uuid;

    try {
      if (PTERO_DEBUG) console.log(`[ptero] getServerDetails: trying application /application/servers/${id}?include=user,node`);
      const res = await appApi.get(`/application/servers/${id}?include=user,node`);
      return res.data;
    } catch (err) {
      tried.push({ endpoint: 'application', status: err.response?.status, msg: err.message });
    }

    try {
      if (PTERO_DEBUG) console.log(`[ptero] getServerDetails: trying client /client/servers/${id}`);
      const res = await clientApi.get(`/client/servers/${id}`);
      return res.data;
    } catch (err) {
      tried.push({ endpoint: 'client', status: err.response?.status, msg: err.message });
    }

    throw new Error(`Failed to fetch server details (${uuid}). Tried: ${JSON.stringify(tried)}`);
  },

  /**
   * Gets the current status of a server.
   * @param {string} uuid Server UUID
   * @returns {Promise<Object>} Status object
   */
  async getStatus(uuid) {
    const id = uuid;
    try {
      if (PTERO_DEBUG) console.log(`[ptero] getStatus: trying client resources /client/servers/${id}/resources`);
      const res = await clientApi.get(`/client/servers/${id}/resources`);
      const normalized = this.normalizeServer(res.data);
      return { status: normalized.status, source: 'client-resources', data: res.data };
    } catch (err) {
      if (PTERO_DEBUG) console.log(`[ptero] getStatus: client resources failed status=${err.response?.status || err.message}`);
    }

    try {
      if (PTERO_DEBUG) console.log(`[ptero] getStatus: trying application details /application/servers/${id}`);
      const res = await appApi.get(`/application/servers/${id}`);
      const normalized = this.normalizeServer(res.data);
      return { status: normalized.status, source: 'application-details', data: res.data };
    } catch (err) {
      if (PTERO_DEBUG) console.log(`[ptero] getStatus: application details failed status=${err.response?.status || err.message}`);
    }

    return { status: 'unknown', source: 'none' };
  },

  /**
   * Gets server resource usage (CPU, RAM, Disk).
   * @param {string} uuid Server UUID
   * @returns {Promise<Object>} Resources object
   */
  async getServerResources(uuid) {
    try {
      const res = await clientApi.get(`/client/servers/${uuid}/resources`);
      return res.data;
    } catch (err) {
      throw new Error(`Failed to fetch resources: ${err.message}`);
    }
  },

  /**
   * Sends a power action to a server.
   * @param {string} uuid Server UUID
   * @param {'start'|'stop'|'restart'|'kill'} action Power action
   * @returns {Promise<Object>} API response
   */
  async powerAction(uuid, action) {
    if (!['start', 'stop', 'restart', 'kill'].includes(action)) throw new Error('Invalid action');
    try {
      const res = await clientApi.post(`/client/servers/${uuid}/power`, { signal: action });
      return res.data;
    } catch (err) {
      const body = err.response ? (typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)) : err.message;
      throw new Error(`Failed to send power action: ${body}`);
    }
  }
};
