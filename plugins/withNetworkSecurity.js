const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withNetworkSecurity(config) {
  // 1. Создаём network_security_config.xml — разрешаем HTTP
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resDir = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'res', 'xml'
      );
      fs.mkdirSync(resDir, { recursive: true });
      fs.writeFileSync(
        path.join(resDir, 'network_security_config.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
</network-security-config>`
      );
      return config;
    },
  ]);

  // 2. Прописываем в AndroidManifest
  config = withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0];
    app.$['android:usesCleartextTraffic'] = 'true';
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return config;
  });

  return config;
}

module.exports = withNetworkSecurity;
