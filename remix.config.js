/** @type {import('@remix-run/dev').AppConfig} */
export default {
  ignoredRouteFiles: ['**/.*'],
  browserNodeBuiltinsPolyfill: {
    modules: {
      events: true,
    },
  },
};
