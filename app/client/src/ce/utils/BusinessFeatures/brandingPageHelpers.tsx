/* eslint-disable @typescript-eslint/no-restricted-imports */
import { default as UpgradeBanner_CE } from "ce/pages/AdminSettings/Branding/UpgradeBanner";
import { default as UpgradeBanner_EE } from "ee/pages/AdminSettings/Branding/UpgradeBanner";
import React from "react";
import {
  getHtmlPageTitle as getHtmlPageTitle_CE,
  getPageTitle as getPageTitle_CE,
} from "ce/utils";
import {
  getHtmlPageTitle as getHtmlPageTitle_EE,
  getPageTitle as getPageTitle_EE,
} from "ee/utils";

export const getUpgradeBanner = (isEnabled: boolean) => {
  if (isEnabled) {
    return <UpgradeBanner_EE />;
  } else return <UpgradeBanner_CE />;
};

export const getHTMLPageTitle = (isEnabled: boolean, brandName?: string) => {
  if (isEnabled) {
    return getHtmlPageTitle_EE(brandName as string);
  } else {
    return getHtmlPageTitle_CE(brandName);
  }
};

export const getPageTitle = (
  isEnabled: boolean,
  displayName: string | undefined,
  titleSuffix: string | undefined,
) => {
  if (isEnabled) {
    return getPageTitle_EE(displayName, titleSuffix);
  } else {
    return getPageTitle_CE(displayName, titleSuffix);
  }
};
