import _ from "lodash";

// Default product name. Overridable per-instance via the Branding page
// (organizationConfig.brandName); callers pass that value in as `brandName`.
export const DEFAULT_BRAND_NAME = "Gravitar";

export const getHtmlPageTitle = (brandName?: string) => {
  return brandName || DEFAULT_BRAND_NAME;
};

export const isCEMode = () => {
  return true;
};

export const getPageTitle = (displayName?: string, titleSuffix?: string) => {
  return `${displayName ? `${displayName} | ` : ""}${
    titleSuffix || DEFAULT_BRAND_NAME
  }`;
};

// TODO: Remove this function once we have a better way to handle this
// get only the part of the url after the domain name
export const to = (url: string) => {
  const path = _.drop(
    url
      .toString()
      .replace(/([a-z])?:\/\//, "$1")
      .split("/"),
  ).join("/");

  return `/${path}`;
};

export const defaultOptionSelected = "";

export function getSnippetUrl(
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isPublicApp: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  method: string,
) {
  return url;
}
