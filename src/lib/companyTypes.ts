/**
 * Aviation MRO/aftermarket industry segments (spec addendum, 2026-09-16):
 * a single "what kind of company are you" dropdown on the attendee profile,
 * grouped by the broader category it belongs to. Stored as a plain `text`
 * column (`attendees.company_type`, nullable, no DB check constraint) --
 * same pattern as `job_function` -- so the option list can be adjusted here
 * without a migration; only the label shown in the UI needs to change.
 *
 * Values are stable slugs (don't rename these without also updating any
 * stored attendee rows) -- labels are what's displayed and can be edited
 * freely.
 */
export interface CompanyTypeGroup {
  label: string;
  options: { value: string; label: string }[];
}

export const COMPANY_TYPE_GROUPS: CompanyTypeGroup[] = [
  {
    label: "OEMs (Original Equipment Manufacturers)",
    options: [
      { value: "oem_airframer", label: "Airframer" },
      { value: "oem_engine_manufacturer", label: "Engine manufacturer" },
      { value: "oem_systems_component", label: "Systems/component OEM" },
    ],
  },
  {
    label: "Tier suppliers",
    options: [{ value: "tier_supplier", label: "Tier supplier (Tier 1, 2, 3)" }],
  },
  {
    label: "Operators",
    options: [
      { value: "operator_airline", label: "Airline (passenger and cargo/freight)" },
      { value: "operator_business_ga", label: "Business/general aviation operator" },
      { value: "operator_charter", label: "Charter operator" },
      { value: "operator_fractional", label: "Fractional ownership operator" },
      { value: "operator_acmi_wetlease", label: "ACMI/wet-lease operator" },
    ],
  },
  {
    label: "MRO (Maintenance, Repair & Overhaul)",
    options: [
      { value: "mro_airframe_heavy", label: "Airframe/heavy maintenance" },
      { value: "mro_engine", label: "Engine MRO" },
      { value: "mro_component_accessory", label: "Component/accessory MRO" },
      { value: "mro_line_maintenance", label: "Line maintenance" },
    ],
  },
  {
    label: "Parts distribution & trading",
    options: [
      { value: "parts_distributor", label: "Distributor (authorized OEM channel)" },
      { value: "parts_trader_broker", label: "Trader/broker" },
      { value: "parts_surplus_aftermarket", label: "Surplus/aftermarket dealer" },
      { value: "parts_consignment_vmi", label: "Consignment / VMI (vendor-managed inventory)" },
      { value: "parts_pma_manufacturer", label: "PMA manufacturer (Parts Manufacturer Approval)" },
    ],
  },
  {
    label: "Asset & lifecycle management",
    options: [
      { value: "asset_lessor", label: "Lessor (aircraft and engine leasing)" },
      { value: "asset_teardown_partout", label: "Teardown / part-out company" },
      { value: "asset_pooling_provider", label: "Engine/parts pooling provider" },
    ],
  },
  {
    label: "Ground & airport support",
    options: [
      { value: "ground_fbo", label: "FBO (Fixed Base Operator)" },
      { value: "ground_handling", label: "Ground handling company" },
      { value: "ground_fuel_supplier", label: "Fuel supplier" },
      { value: "ground_airport", label: "Airport" },
    ],
  },
  {
    label: "Support services & specialty shops",
    options: [
      { value: "support_software_it", label: "Aviation software/IT vendor (ERP, MRO systems, tracking)" },
      { value: "support_consultancy", label: "Consultancy" },
      { value: "support_training", label: "Training organization" },
      { value: "support_completion_interiors", label: "Completion/interiors center" },
      { value: "support_paint_shop", label: "Paint shop" },
    ],
  },
  {
    label: "Other",
    options: [{ value: "other", label: "Other" }],
  },
];

export const COMPANY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  COMPANY_TYPE_GROUPS.flatMap((g) => g.options.map((o) => [o.value, o.label]))
);
