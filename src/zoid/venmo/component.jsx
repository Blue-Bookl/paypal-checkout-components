/* @flow */
/** @jsx node */
/* eslint max-lines: 0 */

import { node, dom } from "@krakenjs/jsx-pragmatic/src";
import {
  getPayPalDomainRegex,
  getVenmoDomainRegex,
  getLocale,
  getEnv,
  getClientID,
  getCommit,
  getSDKMeta,
  getCSPNonce,
  getBuyerCountry,
  getVersion,
  getClientMetadataID,
  getPayPalDomain,
} from "@paypal/sdk-client/src";
import { ZalgoPromise } from "@krakenjs/zalgo-promise/src";
import { create, CONTEXT, type ZoidComponent, EVENT } from "@krakenjs/zoid/src";
import {
  isDevice,
  memoize,
  noop,
  supportsPopups,
  inlineMemoize,
} from "@krakenjs/belter/src";
import { FUNDING } from "@paypal/sdk-constants/src";
import { SpinnerPage, VenmoOverlay } from "@paypal/common-components/src";

import { getSessionID } from "../../lib";
import { containerContent } from "../content";
import type { CheckoutPropsType } from "../checkout/props";

import { DEFAULT_POPUP_SIZE } from "./config";

const CHANNEL = {
  DESKTOP: "desktop-web",
  MOBILE: "mobile-web",
};

export type VenmoCheckoutComponent = ZoidComponent<CheckoutPropsType>;

export function getVenmoCheckoutComponent(): VenmoCheckoutComponent {
  return inlineMemoize(getVenmoCheckoutComponent, () => {
    const component = create({
      tag: "venmo-checkout",
      url: () => `${getPayPalDomain()}${__PAYPAL_CHECKOUT__.__URI__.__VENMO__}`,

      attributes: {
        iframe: {
          scrolling: "yes",
        },
      },

      defaultContext: supportsPopups() ? CONTEXT.POPUP : CONTEXT.IFRAME,

      // $FlowIssue problem with the multiple types this prop takes
      domain: [getPayPalDomainRegex(), getVenmoDomainRegex()],

      prerenderTemplate: ({ doc, props }) => {
        const { nonce } = props;
        return (<SpinnerPage nonce={nonce} />).render(dom({ doc }));
      },

      containerTemplate: ({
        context,
        close,
        focus,
        doc,
        event,
        frame,
        prerenderFrame,
        props,
      }) => {
        const { nonce } = props;
        const content = containerContent("venmo").en;
        return (
          <VenmoOverlay
            context={context}
            close={close}
            focus={focus}
            event={event}
            frame={frame}
            prerenderFrame={prerenderFrame}
            content={content}
            nonce={nonce}
          />
        ).render(dom({ doc }));
      },

      props: {
        clientID: {
          type: "string",
          value: () => getClientID(),
          queryParam: true,
        },

        sessionID: {
          type: "string",
          value: getSessionID,
          queryParam: true,
        },

        buttonSessionID: {
          type: "string",
          queryParam: true,
          required: false,
        },

        stickinessID: {
          type: "string",
          queryParam: true,
          required: false,
        },

        env: {
          type: "string",
          queryParam: true,
          value: getEnv,
        },

        sdkMeta: {
          type: "string",
          queryParam: true,
          value: getSDKMeta,
        },

        nonce: {
          type: "string",
          required: false,
          value: getCSPNonce,
          allowDelegate: true,
        },

        createAuthCode: {
          type: "function",
          queryParam: "code",
          required: false,
          // $FlowFixMe
          queryValue: ({ value }) => ZalgoPromise.try(value),
          // $FlowFixMe
          decorate: ({ value }) => memoize(value),
        },

        buyerCountry: {
          type: "string",
          queryParam: true,
          required: false,
          default: getBuyerCountry,
        },

        locale: {
          type: "object",
          queryParam: "locale.x",
          allowDelegate: true,
          queryValue: ({ value }) => `${value.lang}_${value.country}`,
          value: getLocale,
        },

        channel: {
          type: "string",
          queryParam: true,
          required: false,
          value: () => (isDevice() ? CHANNEL.MOBILE : CHANNEL.DESKTOP),
        },

        parentDomain: {
          type: "string",
          queryParam: true,
          required: true,
        },

        createOrder: {
          type: "function",
          queryParam: "token",
          alias: "payment",
          // $FlowFixMe
          queryValue: ({ value }) => ZalgoPromise.try(value),
          decorate: ({ value }) => memoize(value),
        },

        xcomponent: {
          type: "string",
          queryParam: true,
          value: () => "1",
        },

        version: {
          type: "string",
          queryParam: true,
          value: getVersion,
        },

        commit: {
          type: "boolean",
          queryParam: true,
          value: getCommit,
        },

        fundingSource: {
          type: "string",
          queryParam: true,
          default: () => FUNDING.VENMO,
        },

        standaloneFundingSource: {
          type: "string",
          queryParam: true,
          required: false,
        },

        branded: {
          type: "boolean",
          queryParam: true,
          required: false,
        },

        enableFunding: {
          type: "array",
          queryParam: true,
          required: false,
        },

        onApprove: {
          type: "function",
          alias: "onAuthorize",
        },

        onComplete: {
          type: "function",
          required: false,
        },

        onShippingChange: {
          type: "function",
          required: false,
        },

        onShippingAddressChange: {
          type: "function",
          required: false,
        },

        onShippingOptionsChange: {
          type: "function",
          required: false,
        },

        clientMetadataID: {
          type: "string",
          required: false,
          default: getClientMetadataID,
          queryParam: "client-metadata-id",
        },

        onAuth: {
          type: "function",
          required: false,
          trustedDomains: [getPayPalDomainRegex(), getVenmoDomainRegex()],
        },

        onSmartWalletEligible: {
          type: "function",
          required: false,
          trustedDomains: [getPayPalDomainRegex(), getVenmoDomainRegex()],
        },

        accessToken: {
          type: "string",
          required: false,
        },

        onCancel: {
          type: "function",
          required: false,
        },

        onFocused: {
          type: "function",
          value: ({ event }) => {
            return (handler) => event.on(EVENT.FOCUS, handler);
          },
        },

        incognito: {
          type: "boolean",
          queryParam: true,
          required: false,
        },

        isWebViewEnabled: {
          type: "boolean",
          queryParam: true,
          required: false,
        },

        isThirdPartyContext: {
          type: "boolean",
          queryParam: true,
          required: false,
        },

        venmoWebUrl: {
          type: "string",
          queryParam: true,
          required: true,
        },

        venmoWebEnabled: {
          type: "boolean",
          queryParam: true,
          required: false,
        },

        venmoEnableWebOnNonNativeBrowser: {
          type: "boolean",
          queryParam: true,
          required: false,
        },

        venmoVaultEnabled: {
          type: "boolean",
          queryParam: true,
          required: false,
        },
      },

      dimensions: ({ props }) => {
        if (typeof props.dimensions === "object") {
          return {
            width: `${props.dimensions.width}px`,
            height: `${props.dimensions.height}px`,
          };
        } else {
          return isDevice()
            ? { width: "100%", height: `${DEFAULT_POPUP_SIZE.HEIGHT}px` }
            : {
                width: `${DEFAULT_POPUP_SIZE.WIDTH}px`,
                height: `${DEFAULT_POPUP_SIZE.HEIGHT}px`,
              };
        }
      },
    });

    if (component.isChild()) {
      window.xchild = {
        props: component.xprops,
        show: noop,
        hide: noop,
      };
    }

    return component;
  });
}
