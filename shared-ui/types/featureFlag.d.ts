import type { clientFeatureFlagKeys } from "../constants/featureFlag";

export type ClientFeatureFlagKeys =
	(typeof clientFeatureFlagKeys)[keyof typeof clientFeatureFlagKeys];

export type FeatureFlagKeys = {
	[key in ClientFeatureFlagKeys]: boolean;
};
