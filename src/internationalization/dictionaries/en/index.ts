import auth from './auth.json';
import common from './common.json';
import landing from './landing.json';
import notifications from './notifications.json';
import onboarding from './onboarding.json';
import servers from './servers.json';
import settings from './settings.json';

const en = {
  ...common,
  ...auth,
  ...landing,
  ...notifications,
  ...onboarding,
  ...servers,
  ...settings,
};

export default en;
