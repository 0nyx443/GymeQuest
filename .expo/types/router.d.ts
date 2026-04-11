/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/combat`; params?: Router.UnknownInputParams; } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/post-battle`; params?: Router.UnknownInputParams; } | { pathname: `/store`; params?: Router.UnknownInputParams; } | { pathname: `/../screens/BattleHubScreen`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/combat`; params?: Router.UnknownOutputParams; } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/post-battle`; params?: Router.UnknownOutputParams; } | { pathname: `/store`; params?: Router.UnknownOutputParams; } | { pathname: `/../screens/BattleHubScreen`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; };
      href: Router.RelativePathString | Router.ExternalPathString | `/combat${`?${string}` | `#${string}` | ''}` | `/${`?${string}` | `#${string}` | ''}` | `/post-battle${`?${string}` | `#${string}` | ''}` | `/store${`?${string}` | `#${string}` | ''}` | `/../screens/BattleHubScreen${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/combat`; params?: Router.UnknownInputParams; } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/post-battle`; params?: Router.UnknownInputParams; } | { pathname: `/store`; params?: Router.UnknownInputParams; } | { pathname: `/../screens/BattleHubScreen`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; };
    }
  }
}
