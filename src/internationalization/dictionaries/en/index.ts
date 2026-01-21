import auth from './auth.json';
import common from './common.json';
import landing from './landing.json';
import notifications from './notifications.json';
import onboarding from './onboarding.json';
import servers from './servers.json';

const en = {
  ...common,
  ...auth,
  ...landing,
  ...notifications,
  ...onboarding,
  ...servers,
};

export default en;
