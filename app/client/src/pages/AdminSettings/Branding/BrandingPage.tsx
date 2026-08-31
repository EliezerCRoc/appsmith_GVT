import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";

import Previews from "./previews";
import SettingsForm from "./SettingsForm";
import { getOrganizationConfig } from "ee/selectors/organizationSelectors";
import { Wrapper } from "pages/AdminSettings/Authentication/AuthPage";

import { getAssetUrl } from "ee/utils/airgapHelpers";
import { getUpgradeBanner } from "ee/utils/BusinessFeatures/brandingPageHelpers";

export type brandColorsKeys =
  | "primary"
  | "background"
  | "font"
  | "hover"
  | "disabled";

export interface Inputs {
  brandName: string;
  brandColors: Record<brandColorsKeys, string>;
  brandLogo: string;
  brandFavicon: string;
  logoWidth?: number;
  logoHeight?: number;
}

function BrandingPage() {
  const isBrandingEnabled = true;
  const organizationConfig = useSelector(getOrganizationConfig);
  const defaultValues = {
    brandName: organizationConfig.brandName,
    brandColors: organizationConfig.brandColors,
    brandLogo: organizationConfig.brandLogoUrl,
    brandFavicon: organizationConfig.brandFaviconUrl,
    logoWidth: organizationConfig.logoWidth,
    logoHeight: organizationConfig.logoHeight,
  };
  const {
    control,
    formState,
    getValues,
    handleSubmit,
    reset,
    resetField,
    setValue,
    watch,
  } = useForm<Inputs>({
    defaultValues,
  });

  const values = getValues();

  /**
   * reset the form when the organization config changes
   */
  useEffect(() => {
    reset({
      brandName: organizationConfig.brandName,
      brandColors: organizationConfig.brandColors,
      brandLogo: organizationConfig.brandLogoUrl,
      brandFavicon: organizationConfig.brandFaviconUrl,
      logoWidth: organizationConfig.logoWidth,
      logoHeight: organizationConfig.logoHeight,
    });
  }, [organizationConfig, reset]);

  watch();

  return (
    <Wrapper>
      {getUpgradeBanner(isBrandingEnabled)}
      <div className="grid md:grid-cols-[1fr] lg:grid-cols-[max(300px,30%)_1fr] gap-8 mt-4 pr-7">
        <SettingsForm
          control={control}
          defaultValues={defaultValues}
          disabled={!isBrandingEnabled}
          formState={formState}
          handleSubmit={handleSubmit}
          reset={reset}
          resetField={resetField}
          setValue={setValue}
          values={values}
        />
        <div className="flex-grow">
          <Previews
            favicon={getAssetUrl(values.brandFavicon)}
            logo={getAssetUrl(values.brandLogo)}
            shades={values.brandColors}
          />
        </div>
      </div>
    </Wrapper>
  );
}

export default BrandingPage;
