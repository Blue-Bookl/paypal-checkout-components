/* @flow */
/** @jsx node */
/* eslint max-lines: 0 */

import { node, dom } from "@krakenjs/jsx-pragmatic/src";
import {
  getPayPalDomainRegex,
  getLogger,
  getLocale,
  getEnv,
  getClientID,
  getCommit,
  getSDKMeta,
  getCSPNonce,
  getBuyerCountry,
  getVersion,
  getPayPalDomain,
  getClientMetadataID,
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
import {
  SpinnerPage,
  Overlay,
  VenmoOverlay,
} from "@paypal/common-components/src";

import { getSessionID } from "../../lib";
import { containerContent } from "../content";

import type { CheckoutPropsType } from "./props";
import { fixCreditRedirect } from "./hacks";
import { DEFAULT_POPUP_SIZE } from "./config";

export type CheckoutComponent = ZoidComponent<CheckoutPropsType>;

export function getCheckoutComponent(): CheckoutComponent {
  return inlineMemoize(getCheckoutComponent, () => {
    const component = create({
      tag: "paypal-checkout",
      url: () =>
        `${getPayPalDomain()}${__PAYPAL_CHECKOUT__.__URI__.__CHECKOUT__}`,

      attributes: {
        iframe: {
          scrolling: "yes",
        },
      },

      defaultContext: supportsPopups() ? CONTEXT.POPUP : CONTEXT.IFRAME,

      domain: getPayPalDomainRegex(),

      // 2023-08-23 Shane Brunson
      // I don't think Zoid uses this logger prop and I don't think we the SDK
      // use it anywhere either. I'm trying to fix the main branch from building
      // though and removing all these logger calls is more of risky change than
      // I'm willing to make right now though.
      // $FlowIssue mismatch between beaver-logger and zoid logger type
      logger: getLogger(),

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
        const {
          nonce,
          locale: { lang },
          fundingSource,
        } = props;
        const isVenmo = fundingSource === FUNDING.VENMO;
        const browserLanguage = isVenmo ? "en" : lang;
        const content = containerContent(fundingSource)[browserLanguage];
        if (isVenmo) {
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
        } else {
          return (
            <Overlay
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
        }
      },

      props: {
        atomicsWaitingState: {
          type: "object",
          required: false,
          queryParam: ({ value }) =>
            value?.searchParameter || "atomicsWaitingState",
          queryValue: ({ value }) => value?.encodedState || "",
        },
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

        country: {
          type: "object",
          queryParam: "country.x",
          allowDelegate: true,
          queryValue({ value }): string {
            const { country } = value;
            return country;
          },
          value: getLocale,
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
          default: () => FUNDING.PAYPAL,
          allowDelegate: true,
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

        hasShippingCallback: {
          type: "boolean",
          required: false,
          queryParam: true,
          value: ({ props }) => {
            return Boolean(
              props.onShippingChange ||
                props.onShippingAddressChange ||
                props.onShippingOptionsChange
            );
          },
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
          sameDomain: true,
        },

        onSmartWalletEligible: {
          type: "function",
          required: false,
          sameDomain: true,
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

        test: {
          type: "object",
          default: () => window.__test__ || { action: "checkout" },
        },

        smokeHash: {
          type: "string",
          required: false,
          queryParam: true,
        },

        sign_out_user: {
          type: "boolean",
          queryParam: true,
          required: false,
        },

        hostedButtonId: {
          type: "string",
          required: false,
          queryParam: true,
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

      fixCreditRedirect();
    }

    return component;
  });
}
