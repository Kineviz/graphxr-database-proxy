/**
 * The BigQuery locations a dataset can live in.
 *
 * A query has to be sent to the same location as the dataset it reads, so this
 * is not a free-text field: a typo produces a "dataset not found in location
 * US" failure that reads like a permission problem. The list is the one the
 * BigQuery console offers, grouped the same way.
 *
 * The value is normally filled in for you -- picking a dataset carries its
 * location across -- and this select is what you reach for when the listing
 * could not supply one.
 */

import React from "react";
import { Select } from "antd";
import type { SelectProps } from "antd";

export interface BigqueryRegion {
  value: string;
  label: string;
  /** Google reports this region as running on predominantly carbon-free energy. */
  isLowCO2?: boolean;
}

export interface BigqueryRegionGroup {
  label: string;
  options: BigqueryRegion[];
}

export const BIGQUERY_REGIONS: BigqueryRegionGroup[] = [
  {
    label: "Multi-region",
    options: [
      { value: "US", label: "US (Multiple regions in the United States)" },
      { value: "EU", label: "EU (Multiple regions in Europe)" },
    ],
  },
  {
    label: "Africa",
    options: [{ value: "africa-south1", label: "africa-south1 (Johannesburg)", isLowCO2: true }],
  },
  {
    label: "Americas",
    options: [
      { value: "northamerica-northeast1", label: "northamerica-northeast1 (Montreal)", isLowCO2: true },
      { value: "northamerica-northeast2", label: "northamerica-northeast2 (Toronto)", isLowCO2: true },
      { value: "northamerica-south1", label: "northamerica-south1 (Mexico)" },
      { value: "southamerica-east1", label: "southamerica-east1 (Sao Paulo)", isLowCO2: true },
      { value: "southamerica-west1", label: "southamerica-west1 (Santiago)", isLowCO2: true },
      { value: "us-central1", label: "us-central1 (Iowa)", isLowCO2: true },
      { value: "us-east1", label: "us-east1 (South Carolina)" },
      { value: "us-east4", label: "us-east4 (Northern Virginia)" },
      { value: "us-east5", label: "us-east5 (Columbus)" },
      { value: "us-south1", label: "us-south1 (Dallas)", isLowCO2: true },
      { value: "us-west1", label: "us-west1 (Oregon)", isLowCO2: true },
      { value: "us-west2", label: "us-west2 (Los Angeles)" },
      { value: "us-west3", label: "us-west3 (Salt Lake City)" },
      { value: "us-west4", label: "us-west4 (Las Vegas)" },
    ],
  },
  {
    label: "Europe",
    options: [
      { value: "europe-central2", label: "europe-central2 (Warsaw)" },
      { value: "europe-north1", label: "europe-north1 (Finland)", isLowCO2: true },
      { value: "europe-north2", label: "europe-north2 (Stockholm)", isLowCO2: true },
      { value: "europe-southwest1", label: "europe-southwest1 (Madrid)", isLowCO2: true },
      { value: "europe-west1", label: "europe-west1 (Belgium)", isLowCO2: true },
      { value: "europe-west2", label: "europe-west2 (London)", isLowCO2: true },
      { value: "europe-west3", label: "europe-west3 (Frankfurt)", isLowCO2: true },
      { value: "europe-west4", label: "europe-west4 (Netherlands)", isLowCO2: true },
      { value: "europe-west6", label: "europe-west6 (Zurich)", isLowCO2: true },
      { value: "europe-west8", label: "europe-west8 (Milan)" },
      { value: "europe-west9", label: "europe-west9 (Paris)", isLowCO2: true },
      { value: "europe-west10", label: "europe-west10 (Berlin)", isLowCO2: true },
      { value: "europe-west12", label: "europe-west12 (Turin)" },
    ],
  },
  {
    label: "Asia-Pacific",
    options: [
      { value: "asia-east1", label: "asia-east1 (Taiwan)" },
      { value: "asia-east2", label: "asia-east2 (Hong Kong)" },
      { value: "asia-northeast1", label: "asia-northeast1 (Tokyo)" },
      { value: "asia-northeast2", label: "asia-northeast2 (Osaka)" },
      { value: "asia-northeast3", label: "asia-northeast3 (Seoul)" },
      { value: "asia-south1", label: "asia-south1 (Mumbai)" },
      { value: "asia-south2", label: "asia-south2 (Delhi)" },
      { value: "asia-southeast1", label: "asia-southeast1 (Singapore)" },
      { value: "asia-southeast2", label: "asia-southeast2 (Jakarta)" },
      { value: "australia-southeast1", label: "australia-southeast1 (Sydney)" },
      { value: "australia-southeast2", label: "australia-southeast2 (Melbourne)" },
    ],
  },
  {
    label: "Middle East",
    options: [
      { value: "me-central1", label: "me-central1 (Doha)" },
      { value: "me-central2", label: "me-central2 (Dammam)" },
      { value: "me-west1", label: "me-west1 (Tel Aviv)" },
    ],
  },
  {
    label: "Cross-Cloud",
    options: [
      { value: "aws-ap-northeast-2", label: "aws-ap-northeast-2 (AWS Seoul)" },
      { value: "aws-ap-southeast-2", label: "aws-ap-southeast-2 (AWS Sydney)" },
      { value: "aws-eu-central-1", label: "aws-eu-central-1 (AWS Frankfurt)" },
      { value: "aws-eu-west-1", label: "aws-eu-west-1 (AWS Ireland)" },
      { value: "aws-us-east-1", label: "aws-us-east-1 (AWS Virginia)" },
      { value: "aws-us-west-2", label: "aws-us-west-2 (AWS Oregon)" },
      { value: "azure-eastus2", label: "azure-eastus2 (Azure East US 2)" },
    ],
  },
];

/** Every region id, for callers that need to know whether a value is a known one. */
export const BIGQUERY_REGION_IDS: string[] = BIGQUERY_REGIONS.flatMap((group) =>
  group.options.map((region) => region.value)
);

const renderOption: NonNullable<SelectProps<string>["optionRender"]> = (option) => {
  const region = option.data as Partial<BigqueryRegion>;
  return (
    <span>
      {option.label}
      {region.isLowCO2 && <span style={{ color: "#389e0d", marginLeft: 8 }}>(Low CO2)</span>}
    </span>
  );
};

// Both halves are searchable: "tokyo" and "asia-northeast1" should each find the
// same row, and the id is what a user copies out of the BigQuery console.
const filterOption: NonNullable<SelectProps<string>["filterOption"]> = (input, option) => {
  const needle = input.toLowerCase();
  const label = String(option?.label ?? "").toLowerCase();
  const value = String(option?.value ?? "").toLowerCase();
  return label.includes(needle) || value.includes(needle);
};

interface BigqueryRegionSelectProps {
  /** Supplied by Form.Item; a value outside the list is still displayed as-is. */
  value?: string;
  onChange?: (value: string) => void;
  style?: React.CSSProperties;
  placeholder?: string;
  disabled?: boolean;
}

const BigqueryRegionSelect: React.FC<BigqueryRegionSelectProps> = ({
  value,
  onChange,
  style,
  placeholder = "Select a location",
  disabled,
}) => (
  <Select<string>
    value={value}
    onChange={onChange}
    style={{ width: "100%", ...style }}
    placeholder={placeholder}
    disabled={disabled}
    options={BIGQUERY_REGIONS}
    optionLabelProp="label"
    optionRender={renderOption}
    showSearch
    filterOption={filterOption}
  />
);

export default BigqueryRegionSelect;
