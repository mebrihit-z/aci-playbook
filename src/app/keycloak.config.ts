// keycloak.config.ts
import { environment } from '../environments/environment';
import type { KeycloakInitOptions } from 'keycloak-js';

export const keycloakConfig: {
  config: {
    url: string;
    realm: string;
    clientId: string;
  };
  initOptions: KeycloakInitOptions;
} = {
  config: {
    url: environment.keycloak.url,
    realm: environment.keycloak.realm,
    clientId: environment.keycloak.clientId,
  },
  initOptions: {
    onLoad: 'login-required',  // ⬅ FIXED: no KeycloakOnLoad needed
    checkLoginIframe: false,
  },
};