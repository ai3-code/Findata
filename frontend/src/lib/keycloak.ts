import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: 'https://iseyes.com/auth',
  realm: 'ismonitor',
  clientId: 'findata',
};

const keycloak = typeof window !== 'undefined' ? new Keycloak(keycloakConfig) : null;

export default keycloak;
export { keycloakConfig };
