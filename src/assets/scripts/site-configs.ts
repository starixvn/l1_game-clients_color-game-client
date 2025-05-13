import gc from "@sg/game-client-base";

declare global {
    interface Window {
        envConfig: gc.Configs.SiteConfigs;
        crossConfig: gc.Configs.SiteConfigs;
    }
}

const defaultConfig: gc.Configs.SiteConfigs = {
    isDev: false, // if this property is true, then you should add token=anything into the querytring to sso to the game http://localhost:7456/?token=anything
    systemType: "VG",
    serverDomainMapper: {
        localhost: "lumigame.com",
    },
    ssl: true,
    subDomain: "l2-proxy",
    env: "LOCAL",
    subGuideDomain: "l1-guide-1",
    SGConnectSubDomain: "connectsite",
    enableMsgpackParserAllGames: false,
    enableMsgpackParserOnNotification: false,
    websocket: {
        proxyPath: "colorgame",
        route: "colorgame",
    },
    mainObserverNamespace: "ColorGame",
    tolgeeUrl: "",
    boostedOddsDelayTimeByMinutes: 2,
    storagePrefixKey: "ColorGame",
};

let configDev = {
    isDev: defaultConfig.isDev,
    userServiceUrlDev: defaultConfig.userServiceUrlDev,
    serverDomainMapper: defaultConfig.serverDomainMapper,
    notificationServiceUrlDev: defaultConfig.notificationServiceUrlDev,
    boostedOddsDelayTimeByMinutes: defaultConfig.boostedOddsDelayTimeByMinutes,
};

if (window.envConfig) {
    configDev = {
        isDev: undefined,
        userServiceUrlDev: undefined,
        serverDomainMapper: undefined,
        notificationServiceUrlDev: undefined,
        boostedOddsDelayTimeByMinutes: undefined,
    };
}

export const siteConfigs: gc.Configs.SiteConfigs =
    window.envConfig && window.envConfig.isDev
        ? defaultConfig
        : { ...defaultConfig, ...configDev, ...window.envConfig, ...window.crossConfig };

window.envConfig = siteConfigs;
