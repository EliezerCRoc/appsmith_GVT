import { useCallback } from "react";
import { useDispatch } from "react-redux";

import { objectKeys } from "@appsmith/utils";
import { updateOrganizationConfig } from "ee/actions/organizationActions";
import AnalyticsUtil from "ee/utils/AnalyticsUtil";
import { createBrandColorsFromPrimaryColor } from "utils/BrandingUtils";
import type { Inputs } from "pages/AdminSettings/Branding/BrandingPage";

interface UseBrandingFormProps {
  // react-hook-form's FormState["dirtyFields"] — a sparse map of touched fields.
  dirtyFields: Partial<Record<keyof Inputs, unknown>>;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ImageInput hands back either the original URL string (unchanged) or a freshly
// picked File. Files are inlined as data URIs so branding needs no asset-upload
// endpoint on the server.
async function resolveAsset(value: unknown): Promise<string | undefined> {
  if (typeof File !== "undefined" && value instanceof File) {
    return fileToDataUrl(value);
  }

  if (typeof value === "string" && value.length > 0) return value;

  return undefined;
}

export const useBrandingForm = (props: UseBrandingFormProps) => {
  const { dirtyFields } = props;
  const dispatch = useDispatch();

  const onSubmit = useCallback(
    async (data: Inputs) => {
      const organizationConfiguration: Record<string, unknown> = {};

      if (dirtyFields.brandName) {
        organizationConfiguration.brandName =
          data.brandName?.trim() || undefined;
      }

      if (dirtyFields.brandColors && data.brandColors?.primary) {
        // Keep the admin-editable shades (primary / background / font) and
        // recompute the derived ones (hover / active / disabled) from primary.
        const derived = createBrandColorsFromPrimaryColor(
          data.brandColors.primary,
        );

        organizationConfiguration.brandColors = {
          ...data.brandColors,
          hover: derived.hover,
          active: derived.active,
          disabled: derived.disabled,
        };
      }

      if (dirtyFields.brandLogo) {
        const brandLogoUrl = await resolveAsset(data.brandLogo);

        if (brandLogoUrl) organizationConfiguration.brandLogoUrl = brandLogoUrl;
      }

      if (dirtyFields.brandFavicon) {
        const brandFaviconUrl = await resolveAsset(data.brandFavicon);

        if (brandFaviconUrl) {
          organizationConfiguration.brandFaviconUrl = brandFaviconUrl;
        }
      }

      const updatedKeys = objectKeys(organizationConfiguration);

      if (updatedKeys.length === 0) return;

      AnalyticsUtil.logEvent("BRANDING_SUBMIT_CLICK", {
        properties: updatedKeys,
      });

      dispatch(
        updateOrganizationConfig({
          organizationConfiguration: organizationConfiguration as Record<
            string,
            string
          >,
          isOnlyOrganizationSettings: true,
          // Branding is also read at bootstrap (colors.css tokens, favicon,
          // document title), so reload once the save round-trips.
          needsRefresh: true,
        }),
      );
    },
    [dispatch, dirtyFields],
  );

  return { onSubmit };
};
