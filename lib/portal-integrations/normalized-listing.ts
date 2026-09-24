export type PortalAvailabilityState =
  | "active"
  | "private"
  | "reference"
  | "reserved"
  | "taken";

export type PortalOffer =
  | {
      type: "buy";
      price?: number;
      currency: string;
    }
  | {
      type: "rent";
      currency: string;
      net?: number;
      gross?: number;
      extra?: number;
      interval?:
        | "day"
        | "week"
        | "month"
        | "year";
    };

export type PortalImage = {
  url: string;
  title?: string;
  description?: string;
  mimeType?: string;
};

export type PortalAddress = {
  countryCode: string;
  locality: string;
  postalCode?: string;
  street?: string;
  streetNumber?: string;
  latitude?: number;
  longitude?: number;
};

export type PortalLocalization = {
  languageCode: string;
  title: string;
  excerpt?: string;
  description?: string;
  location?: string;
  equipment?: string;
  images?: PortalImage[];
};

export type PortalNormalizedListing = {
  id: string;
  referenceId: string;

  availability:
    PortalAvailabilityState;

  address: PortalAddress;

  offer: PortalOffer;

  category?: string;

  livingArea?: number;
  rooms?: number;

  createdAt?: Date;
  updatedAt?: Date;

  localization:
    PortalLocalization;
};
