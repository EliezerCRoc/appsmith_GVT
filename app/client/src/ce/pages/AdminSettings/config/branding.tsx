import type { AdminConfigType } from "ee/pages/AdminSettings/config/types";
import {
  CategoryType,
  SettingCategories,
  SettingTypes,
} from "ee/pages/AdminSettings/config/types";
import { selectFeatureFlags } from "ee/selectors/featureFlagsSelectors";
import { isBrandingEnabled } from "ee/utils/planHelpers";
import BrandingPage from "pages/AdminSettings/Branding/BrandingPage";
import store from "store";

const featureFlags = selectFeatureFlags(store.getState());

export const config: AdminConfigType = {
  type: SettingCategories.BRANDING,
  categoryType: CategoryType.ORGANIZATION,
  controlType: SettingTypes.PAGE,
  canSave: true,
  title: "Branding",
  icon: "pantone",
  component: BrandingPage,
  isFeatureEnabled: isBrandingEnabled(featureFlags),
};
